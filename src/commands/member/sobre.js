/*
Comando que fala sobre o bot.
*/

import { PREFIX } from "../../config.js";

export default {
  name: "sobre",
  description: "Exibe informações sobre o bot, criador e seus objetivos",
  commands: ["sobre", "about", "bot"],
  usage: `${PREFIX}sobre`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ sendReply, sendSuccessReact }) => {
    await sendSuccessReact();

    // altere aqui como quiser.
    const sobreText = 
      `⚜️ *SOBRE O BOT*\n` +
      `----------------------------------------\n` +
      `👑 *Criador & Desenvolvedor:* Carlos Martins\n\n` +
      `❓ *Por que o Bot foi criado?*\n\n` +
      `Criei esse bot com o intuito de deixar o dia a dia no WhatsApp legal e com uma compahia extra, automatizando tarefas chatas e trazendo entretenimento para grupos.\n\n` +
      `🎯 *Qual é o grande objetivo?*\n\n` +
      `O objetivo é tornar o Bot um assistente multifuncional, entregando ferramentas de IA, utilitários e brincadeiras para chats.\n` +
      `----------------------------------------\n` +
      `💡 _Use \`${PREFIX}menu\` para ver todos os comandos disponíveis._`;

    await sendReply(sobreText);
  },
};
