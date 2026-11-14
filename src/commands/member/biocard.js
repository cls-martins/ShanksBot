import fs from "fs";
import path from "path";
import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";

export default {
  name: "biocard",
  description: "Divulga a parceria com o BioCard e seus recursos exclusivos",
  commands: ["biocard", "cardbio"],
  usage: `${PREFIX}biocard`,
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
      const bannerPath = path.resolve("assets/images/banner-biocard.png");

      const caption = 
        `✨ *Parceria Oficial — BioCard* ✨\n\n` +
        `Destaque o seu perfil com um *card de bio sob medida*, criado com total liberdade e mais de 20 recursos liberados desde o início para deixar o seu espaço com a sua cara! 🔥\n\n` +
        `💎 *Principais Recursos Inclusos:*\n` +
        `• 🎵 Música de fundo personalizada\n` +
        `• 🎬 Vídeo, banners e imagens de fundo\n` +
        `• 🎨 Cores e estilos de UI ilimitados\n` +
        `• ✨ Efeito de entrada exclusivo ao abrir\n` +
        `• 🏷️ Badges e selos personalizados\n` +
        `• 📂 Abas e links rápidos organizados\n` +
        `• 🚀 Suporte rápido e dedicado\n\n` +
        `💡 *Quer ver como fica?* Temos card de teste disponível para você conferir na prática!\n\n` +
        `🌐 *Conheça todos os detalhes e modelos abaixo:*\n` +
        `https://biocard-site.vercel.app`;

      // Verifica se o banner existe antes de enviar
      if (fs.existsSync(bannerPath)) {
        await sendImageFromFile(bannerPath, caption);
      } else {
        // Fallback caso o banner não seja encontrado na pasta
        console.warn("Banner do BioCard não encontrado no caminho especificado:", bannerPath);
        throw new Error("O arquivo de banner do BioCard não foi encontrado na pasta assets/images/.");
      }

      await sendSuccessReact();
    } catch (error) {
      console.error("Erro ao enviar anúncio do BioCard:", error);
      await sendErrorReply(`❌ Ocorreu um erro ao enviar o anúncio: ${error.message}`);
    }
  },
};
