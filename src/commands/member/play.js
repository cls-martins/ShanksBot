/*
Comando para fazer o bot enviar musica no chat
*/

import fs from "node:fs";
import path from "node:path";
import { exec } from "child_process";
import yts from "yt-search";
import { TEMP_DIR, PREFIX } from "../../config.js";
import { getRandomName } from "../../utils/index.js";

export default {
  name: "play / yt-musica",
  description: "Baixa música do YouTube por nome ou link e envia como nota de voz compatível com iPhone",
  commands: ["play", "yt-musica", "musica", "audio"],
  usage: `${PREFIX}play <nome ou link da música>`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    args,
    socket,
    remoteJid,
    webMessage,
    sendSuccessReact,
    sendErrorReply,
    sendAudioFromFile,
  }) => {
    const query = args.join(" ").trim();
    if (!query) {
      return await sendErrorReply(
        `❌ Digite o nome ou link da música!\nExemplo: \`${PREFIX}play Teto - 24H\``
      );
    }

    let videoUrl = query;
    let videoTitle = "Música do YouTube";

    try {
      await sendSuccessReact();

      // Se não for link direto, pesquisa no YouTube
      if (!query.startsWith("http://") && !query.startsWith("https://")) {
        await socket.sendMessage(
          remoteJid,
          { text: "🔍 Pesquisando música no YouTube..." },
          { quoted: webMessage }
        );

        const searchResult = await yts(query);
        if (!searchResult || searchResult.videos.length === 0) {
          return await sendErrorReply("❌ Nenhuma música encontrada com esse termo.");
        }
        videoUrl = searchResult.videos[0].url;
        videoTitle = searchResult.videos[0].title;
      }

      await socket.sendMessage(
        remoteJid,
        { text: `📥 Baixando e convertendo: *${videoTitle}*...` },
        { quoted: webMessage }
      );

      const downloadAudioPath = path.resolve(TEMP_DIR, getRandomName("m4a"));
      const finalOpusPath = path.resolve(TEMP_DIR, getRandomName("opus"));

      // 1. Baixa o áudio com yt-dlp salvando no disco
      const downloadCmd = `yt-dlp -f "ba[ext=m4a]/ba/b" -o "${downloadAudioPath}" "${videoUrl}"`;

      await new Promise((resolve, reject) => {
        exec(downloadCmd, (error, _, stderr) => {
          if (error) {
            console.error("Erro no download yt-dlp:", stderr);
            reject(new Error("Falha ao baixar o áudio do YouTube."));
          } else {
            resolve();
          }
        });
      });

      if (!fs.existsSync(downloadAudioPath)) {
        return await sendErrorReply("❌ O arquivo de áudio não foi gerado.");
      }

      // 2. Converte para Opus/OGG (Nota de voz compatível com iPhone e Android)
      const ffmpegCmd = `ffmpeg -y -i "${downloadAudioPath}" -c:a libopus -b:a 64k -ar 48000 -ac 1 -f ogg "${finalOpusPath}"`;

      await new Promise((resolve, reject) => {
        exec(ffmpegCmd, (error, _, stderr) => {
          if (error) {
            console.error("Erro no ffmpeg conversão:", stderr);
            reject(new Error("Falha ao converter o áudio."));
          } else {
            resolve();
          }
        });
      });

      // Limpa o arquivo intermediário baixado
      if (fs.existsSync(downloadAudioPath)) {
        fs.unlinkSync(downloadAudioPath);
      }

      if (!fs.existsSync(finalOpusPath)) {
        return await sendErrorReply("❌ Falha ao processar a nota de voz.");
      }

      // Envia como nota de voz (ptt: true)
      await sendAudioFromFile(finalOpusPath, true);

      // Limpa o arquivo final
      if (fs.existsSync(finalOpusPath)) {
        fs.unlinkSync(finalOpusPath);
      }
    } catch (error) {
      console.error("Erro no comando play/yt-musica:", error);
      await sendErrorReply("❌ Ocorreu um erro ao baixar ou processar a música.");
    }
  },
};
