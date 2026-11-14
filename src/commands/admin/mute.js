/*
Comando de mutar membros, com 2 avisos e ban.
*/

import { BOT_LID, OWNER_LID, PREFIX } from "../../config.js";
import { DangerError } from "../../errors/index.js";
import { checkIfMemberIsMuted, muteMember } from "../../utils/database.js";
import { onlyNumbers } from "../../utils/index.js";
import { isHelper } from "./ajudante.js";

export default {
  name: "mute",
  description: "Silencia um usuário no grupo (apaga as mensagens do usuário automaticamente).",
  commands: ["mute", "mutar"],
  usage: `${PREFIX}mute @usuario ou (responda à mensagem do usuário que deseja mutar)`,
  handle: async ({
    args,
    remoteJid,
    replyLid,
    sendErrorReply,
    sendSuccessReply,
    getGroupMetadata,
    isGroup,
    userLid,
    webMessage,
  }) => {
    if (!isGroup) {
      throw new DangerError("Este comando só pode ser usado em grupos.");
    }

    const senderJid = webMessage.key.participant || webMessage.key.remoteJid;
    const cleanSenderNumber = senderJid ? senderJid.replace(/[^0-9]/g, "") : "";

    const groupMetadata = await getGroupMetadata();
    const senderParticipant = groupMetadata.participants.find((p) => {
      const pNumber = p.id.replace(/[^0-9]/g, "");
      return pNumber === cleanSenderNumber;
    });
    const isAdmin =
      senderParticipant?.admin === "admin" ||
      senderParticipant?.admin === "superadmin";

    const isAuthorizedHelper =
      isHelper(remoteJid, senderJid) || (userLid && isHelper(remoteJid, userLid));

    if (!isAdmin && !isAuthorizedHelper) {
      throw new DangerError("Apenas administradores e ajudantes podem usar este comando!");
    }

    const mentions =
      webMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid;

    if (!mentions?.length && !args.length && !replyLid) {
      throw new DangerError(
        `Você precisa mencionar um usuário ou responder à mensagem do usuário que deseja mutar.\n\nExemplo: ${PREFIX}mute @fulano`
      );
    }

    // Pega o ID real da menção, da resposta ou monta pelo número digitado
    const rawTarget = mentions?.[0] || replyLid || `${onlyNumbers(args[0])}@s.whatsapp.net`;
    const targetUserNumber = onlyNumbers(rawTarget);

    // Encontra o participante exato no grupo (lid ou s.whatsapp.net)
    const targetParticipant = groupMetadata.participants.find(
      (p) => onlyNumbers(p.id) === targetUserNumber
    );

    const userId = targetParticipant ? targetParticipant.id : rawTarget;

    if (OWNER_LID && onlyNumbers(userId) === onlyNumbers(OWNER_LID)) {
      throw new DangerError("Você não pode mutar o dono do bot!");
    }

    if (BOT_LID && onlyNumbers(userId) === onlyNumbers(BOT_LID)) {
      throw new DangerError("Você não pode mutar o bot.");
    }

    if (!targetParticipant) {
      return sendErrorReply(
        `O usuário @${targetUserNumber} não está neste grupo.`,
        [userId]
      );
    }

    if (targetParticipant.admin) {
      throw new DangerError("Você não pode mutar um administrador.");
    }

    if (checkIfMemberIsMuted(remoteJid, userId)) {
      return sendErrorReply(
        `O usuário @${targetUserNumber} já está silenciado neste grupo.`,
        [userId]
      );
    }

    muteMember(remoteJid, userId);

    await sendSuccessReply(
      `🔇 @${targetUserNumber} foi mutado com sucesso neste grupo!\n\n` +
      `⚠️ *Regras do Mute:*\n` +
      `• *2 msgs apagadas:* 1º Aviso\n` +
      `• *5 msgs apagadas:* Último Aviso\n` +
      `• *8 msgs apagadas:* Banimento automático`,
      [userId]
    );
  },
};
