/*
Ficheiro de efeitos do menu de audios.
*/

import { exec } from "child_process";
import fs from "node:fs";
import path from "node:path";
import { TEMP_DIR, PREFIX } from "../../config.js";
import { getRandomName } from "../../utils/index.js";

const effects = {
  estourar: "volume=12",
  acelerar: "atempo=1.5",
  slow: "atempo=0.7",
  demon: "asetrate=44100*0.7,aresample=48000",
  monstro: "asetrate=44100*0.7,aresample=48000",
  fino: "asetrate=44100*1.4,aresample=48000",
  robo: "asetrate=22050,aresample=48000,aecho=0.8:0.88:60:0.4",
  eco: "aecho=0.8:0.9:1000:0.5",
  radio: "highpass=300,lowpass=3000,volume=1.5",
  rádio: "highpass=300,lowpass=3000,volume=1.5",
  alien: "asetrate=44100*1.2,aresample=48000,flanger"
};

export default {
  name: "efeitos de audio",
  description: "Aplica efeitos em áudios e notas de voz",
  commands: [
    "estourar",
    "acelerar",
    "slow",
    "demon",
    "monstro",
    "fino",
    "robo",
    "eco",
    "radio",
    "rádio",
    "alien"
  ],
  usage: `${PREFIX}<efeito> (respondendo a um áudio)`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    commandName,
    command,
    webMessage,
    downloadAudio,
    sendAudioFromFile,
    sendSuccessReact,
    sendErrorReply,
  }) => {
    // Garante que pega o nome do comando digitado sem dar erro de undefined
    const cmdName = (commandName || command || "").toLowerCase();

    // Procura a mensagem citada (quoted)
    const contextInfo = webMessage.message?.extendedTextMessage?.contextInfo;
    const quotedMessage = contextInfo?.quotedMessage;

    const isAudio =
      !!webMessage.message?.audioMessage ||
      !!quotedMessage?.audioMessage;

    if (!isAudio) {
      return await sendErrorReply("❌ Responda a um áudio ou nota de voz com o comando!");
    }

    const filter = effects[cmdName];
    if (!filter) return;

    let inputPath = null;
    let outputPath = path.resolve(TEMP_DIR, getRandomName("opus"));

    try {
      await sendSuccessReact();

      // Se for uma resposta a um áudio, passa a mensagem citada para o download
      const targetMessage = quotedMessage ? { message: quotedMessage } : webMessage;
      inputPath = await downloadAudio(targetMessage, getRandomName("mp3"));

      if (!inputPath || !fs.existsSync(inputPath)) {
        return await sendErrorReply("❌ Falha ao baixar o áudio.");
      }

      await new Promise((resolve, reject) => {
        // Conversão OPUS/OGG (compatível com iOS e Android)
        const cmdFFmpeg = `ffmpeg -y -i "${inputPath}" -af "${filter}" -c:a libopus -b:a 32k -ar 48000 -ac 1 -f ogg "${outputPath}"`;
        exec(cmdFFmpeg, (error, _, stderr) => {
          if (error) {
            console.error("FFmpeg audio error:", stderr);
            reject(new Error("Erro ao processar o efeito de áudio."));
          } else {
            resolve();
          }
        });
      });

      // Envia como nota de voz
      await sendAudioFromFile(outputPath, true);

    } catch (error) {
      console.error("Erro no comando de áudio:", error);
      await sendErrorReply("❌ Ocorreu um erro ao modificar o áudio.");
    } finally {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
  },
};
