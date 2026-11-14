/*
Faz administradores bloquearem ou desbloquearem um comando.
*/

import { PREFIX } from "../../config.js";
import { DangerError, WarningError } from "../../errors/index.js";
import { disableCommandGroup, enableCommandGroup, getDisabledCommandsGroup } from "../../utils/database.js";

export default {
  name: "block-cmd",
  description: "Bloqueia ou desbloqueia um comando específico no grupo",
  commands: ["block-cmd", "unblock-cmd", "bloquear-comando", "desbloquear-comando"],
  usage: `${PREFIX}block-cmd <nome-do-comando>`,
  handle: async ({
    args,
    remoteJid,
    sendSuccessReply,
    isGroup,
    webMessage
  }) => {
    if (!isGroup) {
      throw new DangerError("Este comando só pode ser usado em grupos.");
    }

    const commandInput = args[0]?.toLowerCase().replace(PREFIX, "");

    if (!commandInput) {
      const disabledList = getDisabledCommandsGroup(remoteJid);
      const listText = disabledList.length > 0 
        ? disabledList.map(cmd => `• \`${cmd}\``).join("\n")
        : "_Nenhum comando bloqueado neste grupo._";

      throw new WarningError(
        `📌 *Uso correto:* \`${PREFIX}block-cmd <comando>\` ou \`${PREFIX}unblock-cmd <comando>\`\n\n` +
        `📋 *Comandos bloqueados no momento:*\n${listText}`
      );
    }

    // Impede o admin de bloquear o próprio comando de desbloquear!
    if (["block-cmd", "unblock-cmd", "ajudantes", "subir-ajudante"].includes(commandInput)) {
      throw new DangerError("❌ Você não pode bloquear comandos essenciais de administração!");
    }

    const messageText = webMessage.message?.conversation || webMessage.message?.extendedTextMessage?.text || "";
    const isUnblocking = messageText.includes("unblock") || messageText.includes("desbloquear");

    if (isUnblocking) {
      enableCommandGroup(remoteJid, commandInput);
      await sendSuccessReply(`✅ O comando \`${commandInput}\` foi **desbloqueado** com sucesso neste grupo!`);
    } else {
      disableCommandGroup(remoteJid, commandInput);
      await sendSuccessReply(`🚫 O comando \`${commandInput}\` foi **bloqueado** com sucesso neste grupo!`);
    }
  },
};
