/*
Comando para cortar notas de voz e audios.
*/

import { exec } from "child_process";
import fs from "node:fs";
import path from "node:path";
import { TEMP_DIR, PREFIX } from "../../config.js";
import { getRandomName } from "../../utils/index.js";

export default {
  name: "cortar-audio",
  description: "Corta um áudio com formato compatível com iPhone/iOS",
  commands: ["cortar-audio", "corta-audio", "trim"],
  usage: `${PREFIX}cortar-audio 0:03 / 0:07 (respondendo a um áudio)`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    args,
    webMessage,
    downloadAudio,
    sendAudioFromFile,
    sendSuccessReact,
    sendErrorReply,
  }) => {
    // 1. Procura a mensagem citada (quoted)
    const contextInfo = webMessage.message?.extendedTextMessage?.contextInfo;
    const quotedMessage = contextInfo?.quotedMessage;

    const isAudio =
      !!webMessage.message?.audioMessage ||
      !!quotedMessage?.audioMessage;

    if (!isAudio) {
      return await sendErrorReply(
        `❌ Responda a um áudio com o comando e o intervalo!\nExemplo: \`${PREFIX}cortar-audio 0:03 / 0:07\``
      );
    }

    // 2. Extrai o texto completo diretamente da mensagem enviada
    const fullText =
      webMessage.message?.conversation ||
      webMessage.message?.extendedTextMessage?.text ||
      args.join(" ");

    // Remove o nome do comando do texto (ex: "!cortar-audio ")
    const textWithoutCommand = fullText.replace(/^[^\s]+\s*/, "").trim();

    // Procura por formatos de tempo como "0:03 / 0:07", "00:03-00:07", "0:03 0:07" ou "3/7"
    const times = textWithoutCommand.match(/(\d{1,2}:\d{2}|\d{1,2})/g);

    if (!times || times.length < 2) {
      return await sendErrorReply(
        `❌ Formato inválido! Use: \`${PREFIX}cortar-audio 0:03 / 0:07\``
      );
    }

    const startTime = times[0];
    const endTime = times[1];

    let inputPath = null;
    let outputPath = path.resolve(TEMP_DIR, getRandomName("opus"));

    try {
      await sendSuccessReact();

      // Passa a mensagem citada para o download
      const targetMessage = quotedMessage ? { message: quotedMessage } : webMessage;
      inputPath = await downloadAudio(targetMessage, getRandomName("mp3"));

      if (!inputPath || !fs.existsSync(inputPath)) {
        return await sendErrorReply("❌ Falha ao baixar o áudio.");
      }

      await new Promise((resolve, reject) => {
        // Conversão OPUS/OGG (100% compatível com iOS/iPhone e Android)
        const cmd = `ffmpeg -y -i "${inputPath}" -ss ${startTime} -to ${endTime} -c:a libopus -b:a 32k -ar 48000 -ac 1 -f ogg "${outputPath}"`;
        exec(cmd, (error, _, stderr) => {
          if (error) {
            console.error("FFmpeg cut error:", stderr);
            reject(new Error("Erro ao cortar o áudio. Verifique os tempos informados."));
          } else {
            resolve();
          }
        });
      });

      await sendAudioFromFile(outputPath, true);

    } catch (error) {
      console.error("Erro no cortar-audio:", error);
      await sendErrorReply("❌ Ocorreu um erro ao cortar o áudio. Verifique se os tempos estão corretos.");
    } finally {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
  },
};
