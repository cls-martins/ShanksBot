import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";
import { removeMarriage } from "../../utils/marriageDatabase.js";

export default {
  name: "divorciar",
  description: "Divorcia você do seu cônjuge ou do seu trisal",
  commands: ["divorciar", "divorcio"],
  usage: `${PREFIX}divorciar`,
  handle: async ({
    sendSuccessReply,
    sendWarningReply,
    webMessage,
    remoteJid,
    isGroup,
  }) => {
    if (!isGroup) {
      throw new WarningError("❌ Este comando só pode ser utilizado em grupos.");
    }

    const senderJid = webMessage.key.participant || webMessage.key.remoteJid;
    const cleanSender = senderJid.replace(/:[0-9]+/g, "");

    // Remove a união (seja casal ou trisal)
    const exPartners = removeMarriage(remoteJid, cleanSender);

    if (!exPartners || exPartners.length === 0) {
      return await sendWarningReply("⚠️ Você não está casado(a) nem em um trisal no momento.");
    }

    const allMembers = [cleanSender, ...exPartners];
    const mentions = allMembers;

    // Se era um trisal (tinha mais de 1 parceiro)
    if (exPartners.length > 1) {
      const names = allMembers.map((m) => `@${m.split("@")[0]}`).join(", ");
      return await sendSuccessReply(
        `💔 *TRISAL DESFEITO!*\n\n@${cleanSender.split("@")[0]} pediu o divórcio e o trisal formado por ${names} chegou ao fim. Cada um segue o seu caminho! 👋`,
        mentions
      );
    } 
    
    // Se era um casal padrão (1 parceiro)
    const exSpouse = exPartners[0];
    return await sendSuccessReply(
      `💔 *DIVÓRCIO CONCLUÍDO!*\n\nO casamento entre @${cleanSender.split("@")[0]} e @${exSpouse.split("@")[0]} chegou ao fim. Cada um para o seu lado! 👋`,
      mentions
    );
  },
};
