/*
Comando da parceria Cinema Alucard
*/

import fs from "fs";
import path from "path";
import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";

export default {
  name: "cinema",
  description: "Divulga a plataforma Cinema Alucard de streaming sincronizado",
  commands: ["cinema", "filmes", "streaming", "assistir", "series"],
  usage: `${PREFIX}cinema`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    sendWaitReact,
    sendSuccessReact,
    sendErrorReply,
    sendImageFromFile,
  }) => {
    await sendWaitReact();

    try {
      // Caminho exato do banner na estrutura do projeto
      const bannerPath = path.resolve("assets/images/cinema-alucard.png");

      const caption = 
        `🍿 🎬 *CINEMA ALUCARD* 🎬 🍿 ⚜️\n\n` +
        `Quer curtir aquela maratona ou ver um filmaço com a galera sem sair de casa? O *Cinema Alucard* oferece salas de cinema virtuais com *reprodução 100% sincronizada* em tempo real para todo mundo assistir junto! 🚀\n\n` +
        `✨ *Destaques da Plataforma:*\n` +
        `▶️ *Sincronização Perfeita:* Controles de *Play*, *Pause* e *Avançar* em tempo real para todos.\n` +
        `🎥 *Variedade:* Filmes e séries incríveis direto na plataforma, sem complicações.\n` +
        `👥 *Interação:* O espaço ideal para reunir os amigos ou a família.\n\n` +
        `🔗 *Crie sua sala agora mesmo e chame a galera:*\n` +
        `https://cinema-alucard.vercel.app`;

      // Verifica se o banner existe antes de enviar
      if (fs.existsSync(bannerPath)) {
        await sendImageFromFile(bannerPath, caption);
      } else {
        console.warn("Banner do Cinema Alucard não encontrado no caminho especificado:", bannerPath);
        throw new Error("O arquivo de banner do Cinema Alucard não foi encontrado na pasta assets/images/.");
      }

      await sendSuccessReact();
    } catch (error) {
      console.error("Erro ao enviar anúncio do Cinema Alucard:", error);
      await sendErrorReply(`❌ Ocorreu um erro ao enviar o anúncio: ${error.message}`);
    }
  },
};
