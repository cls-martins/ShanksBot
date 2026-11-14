/*
Comando para fazer o bot enviar video do yt.
*/

import fs from "node:fs";
import path from "node:path";
import { exec } from "child_process";
import yts from "yt-search";
import { TEMP_DIR, PREFIX } from "../../config.js";
import { getRandomName } from "../../utils/index.js";

export default {
  name: "yt-video",
  description: "Baixa um vídeo do YouTube por nome ou link",
  commands: ["yt-video", "video", "baixar-video"],
  usage: `${PREFIX}yt-video <nome ou link do vídeo>`,
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
  }) => {
    const query = args.join(" ").trim();
    if (!query) {
      return await sendErrorReply(
        `❌ Digite o nome ou link do vídeo!\nExemplo: \`${PREFIX}yt-video Lo-fi hip hop\``
      );
    }

    let videoUrl = query;
    let videoTitle = "Vídeo do YouTube";

    try {
      await sendSuccessReact();

      // Se não for link direto, pesquisa no YouTube
      if (!query.startsWith("http://") && !query.startsWith("https://")) {
        await socket.sendMessage(
          remoteJid,
          { text: "🔍 Pesquisando vídeo no YouTube..." },
          { quoted: webMessage }
        );

        const searchResult = await yts(query);
        if (!searchResult || searchResult.videos.length === 0) {
          return await sendErrorReply("❌ Nenhum vídeo encontrado com esse termo.");
        }
        videoUrl = searchResult.videos[0].url;
        videoTitle = searchResult.videos[0].title;
      }

      await socket.sendMessage(
        remoteJid,
        { text: `📥 Baixando e comprimindo vídeo: *${videoTitle}*...` },
        { quoted: webMessage }
      );

      const rawVideoPath = path.resolve(TEMP_DIR, getRandomName("mp4"));
      const finalVideoPath = path.resolve(TEMP_DIR, getRandomName("mp4"));

      // 1. Baixa o vídeo com yt-dlp limitando a qualidade para evitar arquivos gigantes (máx 720p)
      const downloadCmd = `yt-dlp -f "bestvideo[height<=720]+bestaudio/best[height<=720]/best" --merge-output-format mp4 -o "${rawVideoPath}" "${videoUrl}"`;

      await new Promise((resolve, reject) => {
        exec(downloadCmd, (error, _, stderr) => {
          if (error) {
            console.error("Erro no yt-dlp video:", stderr);
            reject(new Error("Falha ao baixar o vídeo."));
          } else {
            resolve();
          }
        });
      });

      if (!fs.existsSync(rawVideoPath)) {
        return await sendErrorReply("❌ Falha ao processar o arquivo bruto do vídeo.");
      }

      // 2. Otimiza, redimensiona e comprime via FFmpeg para garantir compatibilidade e tamanho leve para o WhatsApp
      const ffmpegCmd = `ffmpeg -y -i "${rawVideoPath}" -c:v libx264 -preset ultrafast -vf "scale=-2:720" -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart "${finalVideoPath}"`;

      await new Promise((resolve, reject) => {
        exec(ffmpegCmd, (error, _, stderr) => {
          if (error) {
            console.error("Erro na conversão FFmpeg video:", stderr);
            reject(new Error("Falha ao otimizar o vídeo para o WhatsApp."));
          } else {
            resolve();
          }
        });
      });

      // Remove o arquivo bruto pesado
      if (fs.existsSync(rawVideoPath)) {
        fs.unlinkSync(rawVideoPath);
      }

      if (!fs.existsSync(finalVideoPath)) {
        return await sendErrorReply("❌ Falha ao gerar o vídeo final.");
      }

      // Verifica o tamanho do arquivo final gerado
      const stats = fs.statSync(finalVideoPath);
      const fileSizeInMegabytes = stats.size / (1024 * 1024);

      if (fileSizeInMegabytes > 50) {
        if (fs.existsSync(finalVideoPath)) fs.unlinkSync(finalVideoPath);
        return await sendErrorReply("❌ O vídeo ficou muito grande para ser enviado pelo WhatsApp. Tente um vídeo mais curto.");
      }

      // Envia o vídeo otimizado para o WhatsApp
      await socket.sendMessage(
        remoteJid,
        {
          video: { url: finalVideoPath },
          caption: `🎬 *${videoTitle}*`,
        },
        { quoted: webMessage }
      );

      // Limpa o arquivo final após o envio
      if (fs.existsSync(finalVideoPath)) {
        fs.unlinkSync(finalVideoPath);
      }
    } catch (error) {
      console.error("Erro no comando yt-video:", error);
      await sendErrorReply("❌ Ocorreu um erro ao baixar ou enviar o vídeo.");
    }
  },
};
