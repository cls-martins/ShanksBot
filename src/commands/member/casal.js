import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";
import {
  setGroupUnion,
  getSpouses,
  isUserMarriageBlocked,
  createTrisalRequest,
  getPendingTrisal,
  approveTrisalRequest,
  cancelTrisalRequest,
} from "../../utils/marriageDatabase.js";

function getCleanNumber(jid) {
  if (!jid) return "";
  return jid.replace(/[^0-9]/g, "");
}

export default {
  name: "casar",
  description: "Gerencia casamentos, solicitações e confirmações de trisal no grupo",
  commands: ["casar", "marry", "trisal", "aceitar-trisal", "aceitartrisal", "negartrisal"],
  usage: `${PREFIX}casar @membro | ${PREFIX}trisal @membro | ${PREFIX}aceitar-trisal @solicitante`,
  handle: async ({
    sendReply,
    sendWarningReply,
    sendSuccessReply,
    webMessage,
    remoteJid,
    isGroup,
    commandName,
  }) => {
    if (!isGroup) {
      throw new WarningError("❌ Este comando só pode ser utilizado em grupos.");
    }

    const senderJid = webMessage.key.participant || webMessage.key.remoteJid;
    const cleanSender = senderJid.replace(/:[0-9]+/g, "");
    const cleanSenderNumber = getCleanNumber(senderJid);

    const mentions = webMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const quotedParticipant = webMessage.message?.extendedTextMessage?.contextInfo?.participant;

    // ==========================================
    // 1. ACEITAR TRISAL
    // ==========================================
    if (commandName === "aceitar-trisal" || commandName === "aceitartrisal") {
      if (!mentions || mentions.length === 0) {
        throw new WarningError(`❌ Marque quem fez o pedido de trisal para aceitar. Exemplo: \`${PREFIX}aceitar-trisal @membro\``);
      }

      const rawRequester = mentions[0];
      const requesterNumber = getCleanNumber(rawRequester);

      const pending =
        getPendingTrisal(remoteJid, rawRequester) ||
        getPendingTrisal(remoteJid, `${requesterNumber}@s.whatsapp.net`) ||
        getPendingTrisal(remoteJid, `${requesterNumber}@lid`);

      if (!pending) {
        return await sendWarningReply("⚠️ Não existe nenhum pedido de trisal pendente dessa pessoa.");
      }

      const targetCoupleNumbers = pending.targetCouple.map((m) => getCleanNumber(m));
      if (!targetCoupleNumbers.includes(cleanSenderNumber)) {
        return await sendWarningReply("❌ Apenas os membros do casal mencionado podem aceitar o pedido!");
      }

      const result = approveTrisalRequest(remoteJid, pending.requester, senderJid);

      if (result.completed) {
        const [m1, m2, m3] = result.members;
        return await sendSuccessReply(
          `🔥 *TRISAL OFICIALIZADO!* 🔥\n\nAmbos aceitaram! Parabéns ao novo trisal do grupo:\n@${getCleanNumber(m1)} + @${getCleanNumber(m2)} + @${getCleanNumber(m3)} ✨\n\nQue essa união dure bastante! ❤️‍🔥`,
          result.members
        );
      } else {
        return await sendSuccessReply(
          `✅ *1/2 Confirmação Recebida!*\n\n@${cleanSenderNumber} aceitou o pedido!\nFalta apenas a confirmação de @${getCleanNumber(result.pendingFrom)} para o trisal ser formado!`,
          [senderJid, result.pendingFrom]
        );
      }
    }

    // ==========================================
    // 2. NEGAR TRISAL
    // ==========================================
    if (commandName === "negartrisal") {
      if (!mentions || mentions.length === 0) {
        throw new WarningError("❌ Marque quem solicitou o trisal para recusar.");
      }
      const rawRequester = mentions[0];
      const requesterNumber = getCleanNumber(rawRequester);

      cancelTrisalRequest(remoteJid, rawRequester);
      cancelTrisalRequest(remoteJid, `${requesterNumber}@s.whatsapp.net`);
      cancelTrisalRequest(remoteJid, `${requesterNumber}@lid`);

      return await sendWarningReply(`💔 O pedido de trisal de @${requesterNumber} foi recusado.`, [rawRequester]);
    }

    // ==========================================
    // 3. SOLICITAR TRISAL
    // ==========================================
    if (commandName === "trisal") {
      if (isUserMarriageBlocked(cleanSender) || isUserMarriageBlocked(`${cleanSenderNumber}@s.whatsapp.net`)) {
        return await sendWarningReply("⚠️ Você está com o modo solteiro ativo (`!ncasar`). Desative antes de pedir trisal.");
      }

      const senderSpouses = getSpouses(remoteJid, cleanSender);
      if (senderSpouses.length > 0) {
        return await sendWarningReply("⚠️ Você já está casado(a)! Apenas membros solteiros podem solicitar entrar em um casal.");
      }

      let targetJid = mentions?.[0] || quotedParticipant;
      if (!targetJid) {
        throw new WarningError(`❌ Marque um membro do casal que você deseja pedir trisal! Exemplo: \`${PREFIX}trisal @membro\``);
      }

      const targetSpouses = getSpouses(remoteJid, targetJid);

      if (targetSpouses.length === 0) {
        return await sendWarningReply(`⚠️ @${getCleanNumber(targetJid)} não está casado(a)! Para se casar individualmente use \`${PREFIX}casar\`.`, [targetJid]);
      }

      if (targetSpouses.length >= 2) {
        return await sendWarningReply("⚠️ Esse grupo já é um trisal! O bot aceita no máximo 3 pessoas por união.");
      }

      const partnerJid = targetSpouses[0];

      createTrisalRequest(remoteJid, senderJid, targetJid, partnerJid);

      return await sendReply(
        `👀 *PEDIDO DE TRISAL ENVIADO!* 🔥\n\n` +
        `@${cleanSenderNumber} solicitou entrar no relacionamento de @${getCleanNumber(targetJid)} e @${getCleanNumber(partnerJid)}!\n\n` +
        `⚠️ *Para aceitar:* AMBOS do casal precisam digitar:\n` +
        `👉 \`${PREFIX}aceitar-trisal @${cleanSenderNumber}\`\n\n` +
        `❌ Para recusar, digite \`${PREFIX}negartrisal @${cleanSenderNumber}\`.`,
        [senderJid, targetJid, partnerJid]
      );
    }

    // ==========================================
    // 4. CASAMENTO TRADICIONAL (!casar / !marry)
    // ==========================================
    let targetJid = mentions?.[0] || quotedParticipant;

    if (!targetJid) {
      throw new WarningError("❌ Marque ou responda a pessoa com quem você deseja se casar!");
    }

    const cleanTarget = targetJid.replace(/:[0-9]+/g, "");

    if (cleanSender === cleanTarget) {
      throw new WarningError("❌ Você não pode se casar consigo mesmo!");
    }

    if (isUserMarriageBlocked(cleanSender)) {
      return await sendWarningReply(
        "⚠️ Você ativou a proteção pessoal contra casamentos (`!ncasar`). Use `!ncasar` novamente para desativar antes de se casar."
      );
    }

    if (isUserMarriageBlocked(cleanTarget)) {
      return await sendWarningReply(
        `🛑 @${cleanTarget.split("@")[0]} ativou o modo solteiro (\`!ncasar\`) e não aceita novos casamentos no momento!`,
        [cleanTarget]
      );
    }

    const senderSpouses = getSpouses(remoteJid, cleanSender);
    if (senderSpouses.length > 0) {
      return await sendWarningReply(
        `⚠️ Você já está casado(a) com @${senderSpouses[0].split("@")[0]}! Divorcie-se primeiro com \`${PREFIX}divorciar\` ou use \`${PREFIX}trisal\` para pedir entrada em um casal.`,
        [senderSpouses[0]]
      );
    }

    const targetSpouses = getSpouses(remoteJid, cleanTarget);
    if (targetSpouses.length >= 2) {
      return await sendWarningReply(
        `⚠️ @${cleanTarget.split("@")[0]} já faz parte de um trisal completo (limite de 3 pessoas atingido)!`,
        [cleanTarget]
      );
    }

    if (targetSpouses.length === 1) {
      return await sendWarningReply(
        `⚠️ @${cleanTarget.split("@")[0]} já está casado(a)! Para entrar na relação deles, utilize o comando \`${PREFIX}trisal @${cleanTarget.split("@")[0]}\`.`,
        [cleanTarget]
      );
    }

    setGroupUnion(remoteJid, [cleanSender, cleanTarget]);

    return await sendSuccessReply(
      `🎉 *VIVAM OS NOIVOS!* 💍✨\n\n@${cleanSender.split("@")[0]} acabou de se casar com @${cleanTarget.split("@")[0]}!\nDesejamos toda a felicidade ao casal! ❤️`,
      [cleanSender, cleanTarget]
    );
  },
};
