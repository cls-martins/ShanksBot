/*
Comando para impedir casamentos no bot
*/

import { PREFIX } from "../../config.js";
import {
  toggleUserMarriageBlock,
} from "../../utils/marriageDatabase.js";

export default {
  name: "ncasar",
  description: "Ativa ou desativa a proteção pessoal contra casamentos",
  commands: ["ncasar", "bloquearcasar", "solteiro"],
  usage: `${PREFIX}ncasar`,
  handle: async ({
    sendSuccessReply,
    sendWarningReply,
    webMessage,
  }) => {
    const senderJid = webMessage.key.participant || webMessage.key.remoteJid;
    const cleanSender = senderJid.replace(/:[0-9]+/g, "");

    const isBlocked = toggleUserMarriageBlock(cleanSender);

    if (isBlocked) {
      return await sendWarningReply(
        "🛑 *Modo Solteiro Ativado!*\n\nA partir de agora ninguém poderá se casar com você no bot (mesmo se tentarem te marcar)."
      );
    } else {
      return await sendSuccessReply(
        "💖 *Proteção Desativada!*\n\nSeu perfil está livre novamente para aceitar novos casamentos no bot."
      );
    }
  },
};
