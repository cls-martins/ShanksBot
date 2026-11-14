/*
Comando para desmutar membros de um grupo.
*/

import { PREFIX } from "../../config.js";
import { DangerError, WarningError } from "../../errors/index.js";
import { checkIfMemberIsMuted, unmuteMember } from "../../utils/database.js";
import { isHelper } from "./ajudante.js";

export default {
  name: "unmute",
  description: "Desativa o mute de um membro do grupo",
  commands: ["unmute", "desmutar"],
  usage: `${PREFIX}unmute @usuario`,
  handle: async ({ remoteJid, sendSuccessReply, args, isGroup, replyLid, userLid, getGroupMetadata, webMessage }) => {
    if (!isGroup) {
      throw new DangerError("Este comando só pode ser usado em grupos.");
    }

    const senderJid = webMessage.key.participant || webMessage.key.remoteJid;
    const cleanSenderNumber = senderJid ? senderJid.replace(/[^0-9]/g, "") : "";

    const groupMetadata = await getGroupMetadata();
    const senderParticipant = groupMetadata.participants.find(p => {
      const pNumber = p.id.replace(/[^0-9]/g, "");
      return pNumber === cleanSenderNumber;
    });
    const isAdmin = senderParticipant?.admin === "admin" || senderParticipant?.admin === "superadmin";

    const isAuthorizedHelper = isHelper(remoteJid, senderJid) || (userLid && isHelper(remoteJid, userLid));

    if (!isAdmin && !isAuthorizedHelper) {
      throw new DangerError("Apenas administradores e ajudantes podem usar este comando!");
    }

    if (!args.length) {
      throw new DangerError(
        `Você precisa mencionar um usuário para desmutar.\n\nExemplo: ${PREFIX}unmute @fulano`
      );
    }
    const userId = replyLid
      ? replyLid
      : args[0]
      ? `${args[0].replace(/[^0-9]/g, "")}@lid`
      : null;
    if (!checkIfMemberIsMuted(remoteJid, userId)) {
      throw new WarningError("Este usuário não está silenciado!");
    }
    unmuteMember(remoteJid, userId);
    await sendSuccessReply("Usuário desmutado com sucesso!");
  },
};
