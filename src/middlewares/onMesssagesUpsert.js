/**
- Evento chamado quando uma mensagem
- é enviada para o grupo do WhatsApp
 *
 */
import { BOT_LID, DEVELOPER_MODE, OWNER_LID } from "../config.js";
import { badMacHandler } from "../utils/badMacHandler.js";
import {
  checkIfMemberIsMuted,
  incrementMutedMessageCount,
  unmuteMember,
} from "../utils/database.js";
import { dynamicCommand } from "../utils/dynamicCommand.js";
import {
  GROUP_PARTICIPANT_ADD,
  GROUP_PARTICIPANT_LEAVE,
  isAddOrLeave,
  isAtLeastMinutesInPast,
} from "../utils/index.js";
import { loadCommonFunctions } from "../utils/loadCommonFunctions.js";
import { errorLog, infoLog } from "../utils/logger.js";
import { customMiddleware } from "./customMiddleware.js";
import { messageHandler } from "./messageHandler.js";
import { recordMessageEnvelope } from "../utils/messageEnvelopeRegistry.js";
import { hasPaymentMessage } from "../utils/paymentMessage.js";
import { handleAfkReferences } from "./afkHandler.js";
import { onGroupParticipantsUpdate } from "./onGroupParticipantsUpdate.js";
import { handleAntiPhotoSpam } from "../utils/antiPhotoSpam.js";

function isMentionOrReplyToMe(webMessage, socket) {
  if (!webMessage?.message || webMessage.key?.fromMe) return false;

  const myIds = [socket?.user?.id, socket?.user?.lid, BOT_LID, OWNER_LID]
    .filter(Boolean)
    .map((id) => String(id).split(":")[0].split("@")[0]);

  if (!myIds.length) return false;

  const msg = webMessage.message;
  const content =
    msg.extendedTextMessage ||
    msg.imageMessage ||
    msg.videoMessage ||
    msg.audioMessage ||
    msg.stickerMessage ||
    msg.documentMessage ||
    msg.ephemeralMessage?.message?.extendedTextMessage ||
    msg.viewOnceMessage?.message?.extendedTextMessage ||
    msg.viewOnceMessageV2?.message?.extendedTextMessage ||
    null;

  const ctx = content?.contextInfo;
  if (!ctx) return false;

  const mentioned = (ctx.mentionedJid || []).map(
    (jid) => String(jid).split(":")[0].split("@")[0],
  );
  const isMentioned = mentioned.some((id) => myIds.includes(id));

  const quotedParticipant = String(ctx.participant || "")
    .split(":")[0]
    .split("@")[0];
  const isReplyToMe = Boolean(quotedParticipant) && myIds.includes(quotedParticipant);

  return isMentioned || isReplyToMe;
}

export async function onMessagesUpsert({ socket, messages, startProcess }) {
  if (!messages.length) {
    return;
  }

  for (const webMessage of messages) {
    if (DEVELOPER_MODE) {
      infoLog(
        `\n\n⪨========== [ MENSAGEM RECEBIDA ] ==========⪩ \n\n${JSON.stringify(
          messages,
          null,
          2,
        )}`,
      );
    }

    try {
      if (!webMessage?.key?.remoteJid?.endsWith("@g.us")) {
        continue;
      }

      const timestamp = webMessage.messageTimestamp;

      // Registra o envelope (id -> autor/estado) de TODA mensagem de grupo,
      // para corroborar marcações de pagamento e impedir forja (banir inocente).
      recordMessageEnvelope(webMessage, hasPaymentMessage(webMessage));

      if (webMessage?.message) {
        messageHandler(socket, webMessage);
      }

      if (isAtLeastMinutesInPast(timestamp)) {
        continue;
      }

      // Marca como lida apenas mensagens novas que mencionam (@) ou respondem você/o bot
      if (isMentionOrReplyToMe(webMessage, socket)) {
        const delayMs = 1500 + Math.floor(Math.random() * 2500);
        setTimeout(() => {
          socket.readMessages([webMessage.key]).catch(() => {});
        }, delayMs);
      }

      if (isAddOrLeave.includes(webMessage.messageStubType)) {
        let action = "";
        if (webMessage.messageStubType === GROUP_PARTICIPANT_ADD) {
          action = "add";
        } else if (webMessage.messageStubType === GROUP_PARTICIPANT_LEAVE) {
          action = "remove";
        }

        await customMiddleware({
          socket,
          webMessage,
          type: "participant",
          action,
          data: webMessage.messageStubParameters[0],
          commonFunctions: null,
        });

        await onGroupParticipantsUpdate({
          data: webMessage.messageStubParameters[0],
          remoteJid: webMessage.key.remoteJid,
          socket,
          action,
        });

        return;
      }

      // --- VERIFICAÇÃO E MECÂNICA DE MEMBROS MUTADOS ---
      const remoteJid = webMessage?.key?.remoteJid;
      const rawParticipant = webMessage?.key?.participant || webMessage?.participant;
      const cleanParticipantId = rawParticipant?.replace(/:[0-9][0-9]|:[0-9]/g, "");

      if (checkIfMemberIsMuted(remoteJid, cleanParticipantId)) {
        try {
          const { id } = webMessage.key;

          const deleteKey = {
            remoteJid,
            fromMe: false,
            id,
            participant: rawParticipant,
          };

          // 1. Apaga a mensagem enviada pelo membro mutado
          await socket.sendMessage(remoteJid, { delete: deleteKey });

          // 2. Incrementa o contador de infrações no banco de dados
          const deletedCount = incrementMutedMessageCount(remoteJid, cleanParticipantId);
          const targetNumber = cleanParticipantId ? cleanParticipantId.replace(/[^0-9]/g, "") : "";
          const userMention = rawParticipant || cleanParticipantId;

          // 3. Aplica os avisos ou o banimento de acordo com o total de mensagens apagadas
          if (deletedCount === 2) {
            await socket.sendMessage(remoteJid, {
              text: `⚠️ *1º AVISO* ⚠️\n\n@${targetNumber}, você está mutado e suas mensagens estão a ser apagadas! Pare de enviar mensagens ou sofrerá consequências. *(2/8)*`,
              mentions: [userMention],
            });
          } else if (deletedCount === 5) {
            await socket.sendMessage(remoteJid, {
              text: `🚨 *ÚLTIMO AVISO* 🚨\n\n@${targetNumber}, se continuar a enviar mensagens enquanto estiver mutado, será banido automaticamente do grupo! *(5/8)*`,
              mentions: [userMention],
            });
          } else if (deletedCount >= 8) {
            await socket.sendMessage(remoteJid, {
              text: `🔨 *BANIDO POR INSISTÊNCIA* 🔨\n\n@${targetNumber} atingiu o limite de 8 mensagens enviadas enquanto estava mutado e foi removido do grupo.`,
              mentions: [userMention],
            });

            // Remove o usuário do grupo e limpa o mute dele da base de dados
            await socket.groupParticipantsUpdate(remoteJid, [cleanParticipantId], "remove");
            unmuteMember(remoteJid, cleanParticipantId);
          }
        } catch (error) {
          errorLog(
            `Erro ao processar mensagem de membro silenciado (verifique se sou administrador): ${error.message}`,
          );
        }

        return;
      }

      const commonFunctions = loadCommonFunctions({ socket, webMessage });

      if (!commonFunctions) {
        continue;
      }

      const spammed = await handleAntiPhotoSpam({
        socket,
        webMessage,
        remoteJid,
        userLid: commonFunctions?.userLid || rawParticipant,
      });

      if (spammed) {
        continue;
      }

      await customMiddleware({
        socket,
        webMessage,
        type: "message",
        commonFunctions,
      });

      await handleAfkReferences({ webMessage, commonFunctions });

      await dynamicCommand(commonFunctions, startProcess);
    } catch (error) {
      if (badMacHandler.handleError(error, "message-processing")) {
        continue;
      }

      if (badMacHandler.isSessionError(error)) {
        errorLog(`Erro de sessão ao processar mensagem: ${error.message}`);
        continue;
      }

      errorLog(
        `Erro ao processar mensagem: ${error.message} | Stack: ${error.stack}`,
      );

      continue;
    }
  }
}
