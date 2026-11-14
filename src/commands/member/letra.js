/*
Comando para pegar letras de musicas 
*/

import { PREFIX } from "../../config.js";

export default {
  name: "letra",
  description: "Pesquisa e envia a letra de uma música pelo nome ou artista",
  commands: ["letra", "lyrics", "letramusica"],
  usage: `${PREFIX}letra <nome da música ou artista>`,
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
        `❌ Digite o nome da música!\nExemplo: \`${PREFIX}letra Teto 24H\``
      );
    }

    try {
      await sendSuccessReact();

      await socket.sendMessage(
        remoteJid,
        { text: `🔍 Procurando a letra de: *${query}*...` },
        { quoted: webMessage }
      );

      // Consulta a API de letras
      const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!data || data.length === 0 || !data[0].plainLyrics) {
        return await sendErrorReply("❌ Não foi encontrada nenhuma letra para essa música.");
      }

      const track = data[0];
      const lyrics = track.plainLyrics;
      
      // Limpa o título caso venha com formato feio de arquivo (ex: 11-Arctic_Monkeys-Knee_Socks-SMR)
      let rawTitle = track.trackName || query;
      let cleanTitle = rawTitle
        .replace(/[_]/g, " ")
        .replace(/[-]/g, " ")
        .replace(/^\d+\s*/, "")
        .trim();

      const artistTitle = track.artistName || "Desconhecido";

      // Limite de caracteres do WhatsApp
      const maxLength = 4000;
      let formattedLyrics = lyrics;
      if (formattedLyrics.length > maxLength) {
        formattedLyrics = formattedLyrics.substring(0, maxLength) + "\n\n*(...Letra muito longa, parte cortada)*";
      }

      // Truque do "Ler mais" do WhatsApp (linhas invisíveis logo abaixo do cabeçalho)
      const readMoreTrick = "\u200e".repeat(1000) + "\n";

      // Monta a mensagem limpa com o espaçamento do Ler mais
      const messageText = 
        `🎶 *Música:* ${cleanTitle}\n` +
        `🎤 *Artista:* ${artistTitle}\n` +
        `────────────────\n` +
        readMoreTrick +
        formattedLyrics;

      await socket.sendMessage(
        remoteJid,
        { text: messageText },
        { quoted: webMessage }
      );
    } catch (error) {
      console.error("Erro no comando letra:", error);
      await sendErrorReply("❌ Ocorreu um erro ao tentar buscar a letra da música.");
    }
  },
};
