/*
Comando para jogar pedra papel e tesoura com o bot
*/

import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";

export default {
  name: "ppt",
  description: "Jogue Pedra, Papel e Tesoura contra o bot",
  commands: ["ppt", "jokenpo"],
  usage: `${PREFIX}ppt <pedra/papel/tesoura ou emoji>`,
  handle: async ({
    sendText,
    sendWaitReact,
    sendSuccessReact,
    args,
  }) => {
    await sendWaitReact();

    // Se enviado sem argumentos, explica como jogar
    if (!args || args.length === 0) {
      const ajudaMensagem = 
        `🎮 *JOKENPÔ (Pedra, Papel e Tesoura)* 🎮\n\n` +
        `Para jogar contra mim, digite o comando seguido da sua escolha (palavra ou emoji):\n\n` +
        `• \`${PREFIX}ppt pedra\` ou \`🪨\`\n` +
        `• \`${PREFIX}ppt papel\` ou \`📄\`\n` +
        `• \`${PREFIX}ppt tesoura\` ou \`✂️\`\n\n` +
        `*Exemplo:* \`${PREFIX}ppt pedra\``;

      await sendText(ajudaMensagem);
      await sendSuccessReact();
      return;
    }

    const input = args[0].toLowerCase();
    let userChoice = null;

    // Mapeamento inteligente para palavras e emojis
    if (["pedra", "rock", "🪨", "stone"].includes(input)) {
      userChoice = "pedra";
    } else if (["papel", "paper", "📄", "📃"].includes(input)) {
      userChoice = "papel";
    } else if (["tesoura", "scissors", "✂️", "✂"].includes(input)) {
      userChoice = "tesoura";
    }

    if (!userChoice) {
      throw new WarningError(
        `❌ Opção inválida!\n\nUse:\n• \`${PREFIX}ppt pedra\` (🪨)\n• \`${PREFIX}ppt papel\` (📄)\n• \`${PREFIX}ppt tesoura\` (✂️)`
      );
    }

    const emojiMap = {
      pedra: "🪨 Pedra",
      papel: "📄 Papel",
      tesoura: "✂️ Tesoura",
    };

    // Escolha aleatória do bot
    const choices = ["pedra", "papel", "tesoura"];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];

    let resultado = "";

    if (userChoice === botChoice) {
      resultado = "🤝 *Empate!* Tivemos a mesma jogada.";
    } else if (
      (userChoice === "pedra" && botChoice === "tesoura") ||
      (userChoice === "papel" && botChoice === "pedra") ||
      (userChoice === "tesoura" && botChoice === "papel")
    ) {
      resultado = "🎉 *Você ganhou!* Mandou bem!";
    } else {
      resultado = "⚜️ *Eu ganhei!* Mais sorte na próxima vez!";
    }

    const mensagemCard = 
      `🎮 *JOKENPÔ (PPT)* 🎮\n\n` +
      `👤 Você: *${emojiMap[userChoice]}*\n` +
      `⚜️ Bot: *${emojiMap[botChoice]}*\n\n` +
      `${resultado}`;

    await sendText(mensagemCard);
    await sendSuccessReact();
  },
};
