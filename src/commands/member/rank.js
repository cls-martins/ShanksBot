/*
Comando para o bot gerar ranking aleatorio com no máximo 20 participantes do grupo.
*/

import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";

// Lista de categorias padrão permitidas
const DEFAULT_CATEGORIES = {
  corno: { title: "🐂 Ranking dos Mais Cornos", unit: "% de chifre" },
  beleza: { title: "✨ Ranking das Pessoas Mais Bonitas", unit: "% de beleza" },
  feio: { title: "🧟 Ranking das Pessoas Mais Feias", unit: "% de feiura" },
  rico: { title: "💎 Ranking dos Mais Ricos", unit: "% de riqueza" },
  pobre: { title: "💸 Ranking dos Mais Pobres", unit: "% de pobreza" },
  chato: { title: "🥱 Ranking das Pessoas Mais Chatas", unit: "% de chatice" },
  legal: { title: "😎 Ranking das Pessoas Mais Legais", unit: "% de simpatia" },
  triste: { title: "😢 Ranking das Pessoas Mais Tristes", unit: "% de fossa" },
  feliz: { title: "😁 Ranking das Pessoas Mais Felizes", unit: "% de alegria" },
  gostoso: { title: "🔥 Ranking dos Mais Gostosos(as)", unit: "% de sedução" },
  inteligente: { title: "🧠 Ranking dos Mais Inteligentes", unit: "% de QI" },
  dorminhoco: { title: "😴 Ranking dos Maiores Dorminhocos", unit: "% de preguiça" }
};

export default {
  name: "rank",
  description: "Cria um ranking ordenado com até 20 membros do grupo para categorias predefinidas",
  commands: ["rank", "ranking"],
  usage: `${PREFIX}rank <categoria>`,
  handle: async ({
    sendWaitReact,
    sendSuccessReact,
    socket,
    remoteJid,
    args,
  }) => {
    // Verifica se o comando está sendo usado num grupo
    if (!remoteJid.endsWith("@g.us")) {
      throw new WarningError("❌ Este comando só pode ser usado dentro de grupos!");
    }

    const categoryArg = args.join(" ").trim().toLowerCase();

    // Se usar apenas "!rank" sem argumento ou com uma categoria inválida
    if (!categoryArg || !DEFAULT_CATEGORIES[categoryArg]) {
      await sendWaitReact();
      const listText = Object.keys(DEFAULT_CATEGORIES).map(cat => `• \`${PREFIX}rank ${cat}\``).join("\n");
      
      const errorMsg = categoryArg 
        ? `❌ *Categoria inválida!* Escolha apenas uma das categorias abaixo:\n\n${listText}`
        : `🏆 *Menu de Rankings*\n\nEscolha uma das opções disponíveis:\n${listText}`;

      await socket.sendMessage(remoteJid, { text: errorMsg });
      await sendSuccessReact();
      return;
    }

    await sendWaitReact();

    // Obtém os participantes do grupo
    const groupMetadata = await socket.groupMetadata(remoteJid);
    const participants = groupMetadata.participants.map(p => p.id);

    if (participants.length < 5) {
      throw new WarningError("❌ O grupo precisa de pelo menos 5 membros para gerar um ranking!");
    }

    // Embaralha e pega até 20 membros
    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    const selectedMembers = shuffled.slice(0, Math.min(20, participants.length));

    // Define o título e a unidade baseados estritamente na categoria selecionada
    const { title: rankTitle, unit } = DEFAULT_CATEGORIES[categoryArg];

    // Gera pontuações genéricas para cada membro selecionado (1 a 100)
    const rankedData = selectedMembers.map(memberId => {
      const score = Math.floor(Math.random() * 100) + 1;
      return { memberId, score };
    });

    // Ordena do MAIOR para o MENOR
    rankedData.sort((a, b) => b.score - a.score);
    
    // Efeito "Ler mais" logo antes da lista começar
    const readMore = "\u200e".repeat(4000);
    let text = `🏆 *${rankTitle}* 🏆\n${readMore}\n`;

    const topMembers = [];

    rankedData.forEach((item, index) => {
      const pos = index + 1;
      let medal = `${pos}º`;
      if (pos === 1) medal = "🥇";
      else if (pos === 2) medal = "🥈";
      else if (pos === 3) medal = "🥉";

      const cleanPhone = item.memberId.replace(/:[0-9]+/, "").split("@")[0];
      text += `${medal} @${cleanPhone} — *${item.score}${unit}*\n`;
      topMembers.push(item.memberId);
    });

    text += `\n✨ _Ranking gerado com sucesso!_`;

    // Envia a mensagem marcando os membros ordenados
    await socket.sendMessage(remoteJid, {
      text: text,
      mentions: topMembers
    });

    await sendSuccessReact();
  },
};
