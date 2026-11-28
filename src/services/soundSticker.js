/*
Serviço para criar e enviar stickers animados com áudio (sound stickers) no WhatsApp usando o Baileys.
O serviço utiliza ffmpeg para processar vídeos, extrair áudio e gerar stickers no formato WebP com metadados apropriados.
Ele também implementa um patch para anexar mensagens de áudio ao sticker no protocolo do WhatsApp.
Com isso, é possível criar figurinhas animadas que reproduzem áudio quando visualizadas no WhatsApp.
O serviço define funções para:
- Inspecionar vídeos e verificar duração e presença de áudio.
- Criar arquivos WebP a partir de vídeos, aplicando compressão e filtros para atender aos limites de tamanho do WhatsApp.
- Criar arquivos OGG com áudio extraído do vídeo.
- Gerar uma forma de onda (waveform) do áudio para exibição no sticker.
- Enviar o sticker com áudio para o chat do WhatsApp, utilizando a biblioteca Baileys.
O serviço também gerencia arquivos temporários e garante que sejam removidos após o envio do sticker. 
*/

import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import webp from "node-webpmux";
import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
} from "baileys";
import { TEMP_DIR } from "../config.js";
import { getRandomName, getRandomNumber } from "../utils/index.js";

const execFileAsync = promisify(execFile);
const AUDIO_MIMETYPE = "audio/ogg; codecs=opus";
const MAX_STICKER_BYTES = 850 * 1024;
const MAX_SECONDS = 8;

const STICKER_METADATA = {
  username: "Sticker feito em Shanks Bot",
  botName: "Acesse nosso grupo! https://newgen-shitpost.vercel.app",
};

// Patch embutido para anexar AudioMessage no campo protobuf 26 de StickerMessage
const STICKER_AUDIO_FIELD = 26;
const STICKER_AUDIO_TAG = (STICKER_AUDIO_FIELD << 3) | 2;
const PATCHED = Symbol.for("shanksbot.sound-sticker.encode-patched");
const pendingAudio = new Map();

const keyOf = (hash) => Buffer.from(hash).toString("base64");

function attachStickerAudio(fileSha256, encodedAudioMessage) {
  pendingAudio.set(keyOf(fileSha256), encodedAudioMessage);
}

function detachStickerAudio(fileSha256) {
  pendingAudio.delete(keyOf(fileSha256));
}

function installStickerAudioPatch(waProto) {
  const StickerMessage = waProto?.Message?.StickerMessage;

  if (!StickerMessage?.encode) {
    throw new Error(
      "Baileys não exportou proto.Message.StickerMessage.encode; patch não instalado."
    );
  }

  if (StickerMessage.encode[PATCHED]) return;

  const originalEncode = StickerMessage.encode;

  function patchedEncode(message, writer) {
    const result = originalEncode.call(this, message, writer);

    if (message?.fileSha256) {
      const audio = pendingAudio.get(keyOf(message.fileSha256));
      if (audio) {
        result.uint32(STICKER_AUDIO_TAG).bytes(audio);
      }
    }

    return result;
  }

  patchedEncode[PATCHED] = true;
  StickerMessage.encode = patchedEncode;
}

async function addWebpMetadata(webpPath, metadata) {
  const outPath = path.resolve(TEMP_DIR, getRandomName("webp"));
  const img = new webp.Image();

  const json = {
    "sticker-pack-id": `${getRandomNumber(10_000, 99_999)}`,
    "sticker-pack-name": metadata.username,
    "sticker-pack-publisher": metadata.botName,
    emojis: metadata.categories ? metadata.categories : [""],
  };

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ]);

  const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
  const exif = Buffer.concat([exifAttr, jsonBuff]);
  exif.writeUIntLE(jsonBuff.length, 14, 4);

  await img.load(webpPath);
  img.exif = exif;
  await img.save(outPath);

  return outPath;
}

async function runFfmpeg(args, options = {}) {
  return execFileAsync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
}

async function inspectVideo(filePath) {
  const { stdout } = await execFileAsync(
    "ffprobe",
    [
      "-v", "error",
      "-show_entries", "format=duration:stream=codec_type",
      "-of", "json",
      filePath,
    ],
    { maxBuffer: 4 * 1024 * 1024 }
  );

  const data = JSON.parse(stdout);
  const duration = Number(data.format?.duration);
  const hasAudio = (data.streams || []).some((stream) => stream.codec_type === "audio");

  if (!hasAudio) {
    throw new Error("Esse vídeo não possui áudio. Envie um vídeo com som.");
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Não consegui identificar a duração do vídeo.");
  }

  return { duration: Math.min(duration, MAX_SECONDS) };
}

function stickerFilter(fps) {
  return `fps=${fps},scale=350:350,format=rgba`;
}

async function createWebp(videoPath, outputPath, duration) {
  const presets = [
    { fps: 15, quality: 65 },
    { fps: 15, quality: 45 },
    { fps: 12, quality: 35 },
    { fps: 12, quality: 25 },
    { fps: 10, quality: 20 },
  ];

  for (const preset of presets) {
    await runFfmpeg([
      "-t", duration.toFixed(3),
      "-i", videoPath,
      "-an",
      "-c:v", "libwebp",
      "-lossless", "0",
      "-q:v", String(preset.quality),
      "-compression_level", "4",
      "-vf", stickerFilter(preset.fps),
      "-loop", "0",
      outputPath,
    ]);

    const size = fs.statSync(outputPath).size;
    if (size <= MAX_STICKER_BYTES) return;
  }

  throw new Error(
    "O vídeo ficou acima do limite mesmo após a compressão. Tente um vídeo mais curto ou com menos movimento."
  );
}

async function createOgg(videoPath, outputPath, duration) {
  const seconds = duration.toFixed(3);

  await runFfmpeg([
    "-i", videoPath,
    "-t", seconds,
    "-vn",
    "-map", "0:a:0",
    "-af", `aresample=48000:first_pts=0,apad=whole_dur=${seconds}`,
    "-ac", "1",
    "-ar", "48000",
    "-c:a", "libopus",
    "-b:a", "64k",
    "-map_metadata", "-1",
    "-f", "ogg",
    outputPath,
  ]);
}

async function createWaveform(oggPath) {
  const { stdout } = await runFfmpeg(
    [
      "-i", oggPath,
      "-vn",
      "-f", "s16le",
      "-ac", "1",
      "-ar", "8000",
      "pipe:1",
    ],
    { encoding: "buffer" }
  );

  const pcm = Buffer.from(stdout);
  const samples = Math.floor(pcm.length / 2);
  const bars = 64;
  const levels = new Array(bars).fill(0);

  if (samples > 0) {
    const perBar = Math.max(1, Math.floor(samples / bars));

    for (let bar = 0; bar < bars; bar++) {
      const from = bar * perBar;
      const to = Math.min(samples, from + perBar);
      let sum = 0;

      for (let i = from; i < to; i++) {
        sum += Math.abs(pcm.readInt16LE(i * 2));
      }

      levels[bar] = to > from ? sum / (to - from) : 0;
    }
  }

  const peak = Math.max(...levels) || 1;
  return Uint8Array.from(levels.map((value) => Math.round((value / peak) * 100)));
}

function ownJidFor(socket, chatJid) {
  const me = socket.user || {};
  return chatJid.endsWith("@lid") && me.lid ? me.lid : me.id;
}

async function sendSoundSticker(socket, chatJid, webpPath, oggPath, seconds, quoted) {
  installStickerAudioPatch(proto);

  const uploadOptions = { upload: socket.waUploadToServer };

  const uploadedAudio = await prepareWAMessageMedia(
    {
      audio: fs.readFileSync(oggPath),
      mimetype: AUDIO_MIMETYPE,
      seconds,
    },
    uploadOptions
  );

  const waveform = await createWaveform(oggPath);

  const uploadedSticker = await prepareWAMessageMedia(
    {
      sticker: fs.readFileSync(webpPath),
      isAnimated: true,
    },
    uploadOptions
  );

  const audio = uploadedAudio.audioMessage;
  const audioBytes = proto.Message.AudioMessage.encode(
    proto.Message.AudioMessage.create({
      url: audio.url,
      mimetype: AUDIO_MIMETYPE,
      fileSha256: audio.fileSha256,
      fileLength: audio.fileLength,
      seconds,
      ptt: false,
      mediaKey: audio.mediaKey,
      fileEncSha256: audio.fileEncSha256,
      directPath: audio.directPath,
      mediaKeyTimestamp: audio.mediaKeyTimestamp || Math.floor(Date.now() / 1000),
      waveform,
    })
  ).finish();

  const sticker = uploadedSticker.stickerMessage;
  sticker.mimetype = sticker.mimetype || "image/webp";
  sticker.isAnimated = true;
  sticker.width = 350;
  sticker.height = 350;
  sticker.stickerSentTs = String(Date.now());

  attachStickerAudio(sticker.fileSha256, audioBytes);

  try {
    const message = generateWAMessageFromContent(
      chatJid,
      { stickerMessage: sticker },
      {
        quoted,
        userJid: ownJidFor(socket, chatJid),
      }
    );

    await socket.relayMessage(chatJid, message.message, {
      messageId: message.key.id,
    });
  } finally {
    detachStickerAudio(sticker.fileSha256);
  }
}

export async function createSoundSticker(paramsHandler) {
  const { socket, webMessage, downloadVideo } = paramsHandler;

  const inputPath = await downloadVideo(webMessage, getRandomName());
  if (!inputPath || !fs.existsSync(inputPath)) {
    throw new Error("Não consegui baixar o vídeo enviado ou citado.");
  }

  const rawWebpPath = path.resolve(TEMP_DIR, getRandomName("webp"));
  let finalWebpPath = null;
  const oggPath = path.resolve(TEMP_DIR, getRandomName("ogg"));

  try {
    const { duration } = await inspectVideo(inputPath);

    await createWebp(inputPath, rawWebpPath, duration);
    finalWebpPath = await addWebpMetadata(rawWebpPath, STICKER_METADATA);
    await createOgg(inputPath, oggPath, duration);

    await sendSoundSticker(
      socket,
      webMessage.key.remoteJid,
      finalWebpPath,
      oggPath,
      Math.max(1, Math.round(duration)),
      webMessage
    );
  } finally {
    await Promise.all(
      [inputPath, rawWebpPath, finalWebpPath, oggPath]
        .filter(Boolean)
        .map((file) => fs.promises.rm(file, { force: true }).catch(() => {}))
    );
  }
}
