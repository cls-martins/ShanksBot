/*
Administradores podem usar o bot para deletar uma mensagem.
*/

import { PREFIX } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";
import { deletePaymentMessageWithFallback } from "../../utils/deletePaymentMessage.js";
import { getQuotedPaymentContext } from "../../utils/paymentMessage.js";
import { isHelper } from "./ajudante.js";

export default {
  name: "delete",
  description: "Excluo mensagens",
  commands: ["delete", "d", "apagar", "apaga", "delete-msg", "deletar", "del"],
  usage: `${PREFIX}delete (mencione uma mensagem)`,
  handle: async ({ deleteMessage, webMessage, remoteJid, socket, userLid, getGroupMetadata, isGroup }) => {
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
        throw new InvalidParameterError("Apenas administradores e ajudantes podem usar este comando!");
      }
    }

    if (!webMessage?.message?.extendedTextMessage?.contextInfo) {
      throw new InvalidParameterError(
        "Você deve mencionar uma mensagem para excluir!",
      );
    }

    const { stanzaId, participant } =
      webMessage?.message?.extendedTextMessage?.contextInfo;

    if (!stanzaId || !participant) {
      throw new InvalidParameterError(
        "Você deve mencionar uma mensagem para excluir!",
      );
    }

    const quotedPayment = getQuotedPaymentContext(webMessage);

    if (quotedPayment?.stanzaId) {
      await deletePaymentMessageWithFallback({
        socket,
        remoteJid,
        messageKey: {
          remoteJid,
          fromMe: false,
          id: quotedPayment.stanzaId,
          participant: quotedPayment.participant || participant,
        },
      });
    } else {
      await deleteMessage({
        remoteJid,
        fromMe: false,
        id: stanzaId,
        participant,
      });
    }

    await deleteMessage(webMessage.key);
  },
};
