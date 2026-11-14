/*
Faz o bot enviar a descrição do grupo como comando de regras.
*/

import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";

export default {
  name: "regras",
  description: "Exibe a descrição e as regras atuais do grupo com botão 'ler mais'",
  commands: ["regras", "regras-grupo", "desc", "descricao"],
  usage: `${PREFIX}regras`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    sendReply,
    sendWaitReact,
    sendSuccessReact,
    remoteJid,
    isGroup,
    socket,
  }) => {
    if (!isGroup) {
      throw new WarningError("❌ Este comando só pode ser utilizado dentro de grupos.");
    }

    await sendWaitReact();

    try {
      // Busca os metadados atualizados do grupo
      const groupMetadata = await socket.groupMetadata(remoteJid);
      const groupName = groupMetadata.subject;
      const groupDescription = groupMetadata.desc;

      if (!groupDescription || !groupDescription.trim()) {
        return await sendReply(
          `📜 **REGRAS DO GRUPO** 📜\n\n` +
          `*(Este grupo ainda não possui uma descrição definida pelos administradores.)*`
        );
      }

      // Código invisível que força o botão "ler mais" no WhatsApp
      const readMore = "\u200B".repeat(4001);

      const messageText = 
        `📜 **REGRAS E DESCRIÇÃO DE: ${groupName.toUpperCase()}** 📜` +
        `${readMore}\n\n` +
        `${groupDescription.trim()}\n\n` +
        `───────────────\n` +
        `💡 *Respeite as regras para manter a boa convivência no grupo!*`;

      await sendReply(messageText);
      await sendSuccessReact();
    } catch (error) {
      console.error("Erro ao obter regras/descrição do grupo:", error);
      throw new WarningError("❌ Não foi possível carregar a descrição do grupo neste momento.");
    }
  },
};
