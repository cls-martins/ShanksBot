/*
Comando para tirar a advertencia do membro do grupo
*/

import { BOT_LID, OWNER_LID } from "../../config.js";
import { DangerError, InvalidParameterError } from "../../errors/index.js";
import { onlyNumbers } from "../../utils/index.js";
import { errorLog } from "../../utils/logger.js";
import {
  getAllWarns,
  removeLastWarn,
  revokeWarnByIndex,
} from "../../utils/warnSystem.js";
import { isHelper } from "./ajudante.js";

export default {
  name: "unwarn",
  description: "Remove ou lista advertências válidas.",
  commands: ["unwarn", "perdoaradvertência", "perdoaradvt", "removeradvertencia", "advtremove"],
  handle: async ({
    args,
    isReply,
    replyLid,
    remoteJid,
    sendReply,
    sendErrorReply,
    userLid,
    isGroup,
    getGroupMetadata,
    webMessage,
  }) => {
    try {
      if (isGroup) {
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
      }

      if (!args.length && !isReply) {
        throw new InvalidParameterError(
          "Mencione um usuário ou responda a uma mensagem.",
        );
      }

      if (args.length && !args[0].includes("@")) {
        throw new InvalidParameterError('Use "@" ao mencionar um usuário.');
      }

      const targetLid = isReply ? replyLid : `${onlyNumbers(args[0])}@lid`;

      if (!targetLid) {
        throw new InvalidParameterError("Membro inválido!");
      }

      if (targetLid === BOT_LID || targetLid === OWNER_LID) {
        throw new DangerError(
          "Não é possível alterar advertências deste usuário.",
        );
      }

      const action = args[1]?.toLowerCase();
      const allWarns = getAllWarns(remoteJid, targetLid);
      const validWarns = allWarns.filter((w) => w.valid);

      if (validWarns.length === 0) {
        return sendReply("Usuário não tem advertências válidas.");
      }

      if (action === "list") {
        let msg = `📋 *Advertências válidas de @${targetLid.split("@")[0]}:*\n\n`;
        validWarns.forEach((w, i) => {
          const date = new Date(w.timestamp).toLocaleDateString("pt-BR");
          msg += `${i + 1}. "${w.reason}" (${date})\n`;
        });

        return sendReply(msg, [targetLid]);
      }

      if (action && !isNaN(action)) {
        const index = parseInt(action, 10) - 1;
        if (index >= 0 && index < validWarns.length) {
          revokeWarnByIndex(remoteJid, targetLid, index);
          return sendReply(`✅ Advertência #${index + 1} removida.`);
        }
      }

      removeLastWarn(remoteJid, targetLid);
      await sendReply(`✅ Última advertência removida.`);
    } catch (error) {
      errorLog(JSON.stringify(error, null, 2));
      await sendErrorReply(`Erro: ${error.message}`);
    }
  },
};
