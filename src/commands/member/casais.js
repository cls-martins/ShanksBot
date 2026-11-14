/*
Comando para ver a lista de casais do grupo
*/

import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";
import { getGroupMarriages } from "../../utils/marriageDatabase.js";

export default {
  name: "casais",
  description: "Lista todos os casais e trisais do grupo",
  commands: ["casais", "casais-lista", "lista-casais"],
  usage: `${PREFIX}casais`,
  handle: async ({ sendReply, remoteJid, isGroup }) => {
    if (!isGroup) {
      throw new WarningError("❌ Este comando só pode ser utilizado em grupos.");
    }

    const unions = getGroupMarriages(remoteJid);

    if (!unions || unions.length === 0) {
      return await sendReply("💔 Não há nenhum casal ou trisal registrado neste grupo ainda.");
    }

    let text = `💍 *UNIÕES DO GRUPO* 💍\n\n`;
    const mentions = [];

    unions.forEach((group, index) => {
      const names = group.map((m) => `@${m.split("@")[0]}`).join(" ❤️ ");
      const tag = group.length === 3 ? "🔥 *(Trisal)*" : "✨ *(Casal)*";
      text += `${index + 1}. ${names} ${tag}\n`;
      mentions.push(...group);
    });

    return await sendReply(text, mentions);
  },
};
