/*
Comando de parceria NewGen.
*/

import fs from "fs";
import path from "path";
import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";

export default {
  name: "newgen",
  description: "Divulga a comunidade de shitpost NewGen",
  commands: ["newgen", "shitpost", "meme", "memes"],
  usage: `${PREFIX}newgen`,
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
      const bannerPath = path.resolve("assets/images/newgen.png");

      const caption = 
        `🔥 *PARCERIA OFICIAL — NEWGEN SHITPOST* 🔥 ⚜️\n\n` +
        `Cansou de ver os mesmos memes reciclados e sem graça pela internet? Chega mais e cola com a gente! A *NewGen Shitpost* é o refúgio definitivo para quem vive de shitpost, humor ácido e memes totalmente sem contexto. 💀\n\n` +
        `💥 *O que rola por lá:*\n` +
        `• 💀 Espaço livre para postar suas maiores atrocidades\n` +
        `• 🌀 Memes completamente sem sentido e de qualidade duvidosa\n` +
        `• 🗣️ A melhor resenha e a galera reunida\n\n` +
        `Junte-se à nossa comunidade, solte seus melhores memes e venha espalhar a zoeira com a gente! 👇\n\n` +
        `🔗 *Acesse agora mesmo:*\n` +
        `https://newgen-shitpost.vercel.app`;

      // Verifica se o banner existe antes de enviar
      if (fs.existsSync(bannerPath)) {
        await sendImageFromFile(bannerPath, caption);
      } else {
        console.warn("Banner da NewGen não encontrado no caminho especificado:", bannerPath);
        throw new Error("O arquivo de banner da NewGen não foi encontrado na pasta assets/images/.");
      }

      await sendSuccessReact();
    } catch (error) {
      console.error("Erro ao enviar anúncio da NewGen:", error);
      await sendErrorReply(`❌ Ocorreu um erro ao enviar o anúncio: ${error.message}`);
    }
  },
};
