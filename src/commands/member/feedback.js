import { PREFIX } from "../../config.js";

// Números formatados (com e sem o 9º dígito para evitar falha de entrega do Baileys)
const OWNER_JIDS = [
  "5588981924454@s.whatsapp.net", // Com 9
  "558881924454@s.whatsapp.net"   // Sem 9
];

export default {
  name: "feedback / reportar / bug",
  description: "Envia um feedback, report de erro ou sugestão diretamente para o dono do bot",
  commands: ["feedback", "reportar", "bug", "report", "sugestao"],
  usage: `${PREFIX}reportar <sua mensagem / descrição do erro>`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    args,
    socket,
    remoteJid,
    webMessage,
    sendSuccessReact,
    sendErrorReply,
    sendReply,
    fullArgs,
    commandName,
  }) => {
    const text = fullArgs ? fullArgs.trim() : args.join(" ").trim();

    if (!text) {
      return await sendErrorReply(
        `❌ Por favor, escreva a sua mensagem!\nExemplo: \`${PREFIX}${commandName} O comando !play apresentou um erro.\``
      );
    }

    try {
      await sendSuccessReact();

      // Identifica o comando usado para personalizar o título
      const cmd = commandName ? commandName.toLowerCase() : "reportar";
      let headerTitle = "📩 *NOVO REPORT RECEBIDO*";

      if (cmd === "bug") {
        headerTitle = "🐞 *NOVO BUG REPORTADO*";
      } else if (cmd === "feedback") {
        headerTitle = "💬 *NOVO FEEDBACK RECEBIDO*";
      } else if (cmd === "sugestao") {
        headerTitle = "💡 *NOVA SUGESTÃO RECEBIDA*";
      }

      // Identifica quem enviou
      const senderNumber = webMessage.key.participant || webMessage.key.remoteJid;
      const formattedSender = senderNumber.replace(/@s\.whatsapp\.net|@g\.us/g, "");

      // Monta a mensagem personalizada
      const reportMessage = 
        `${headerTitle}\n` +
        `───────────────────\n` +
        `👤 *Enviado por:* @${formattedSender}\n` +
        `📍 *Origem (JID):* \`${remoteJid}\`\n` +
        `📝 *Tipo:* \`${PREFIX}${cmd}\`\n\n` +
        `💬 *Mensagem:*\n` +
        `> ${text}\n` +
        `───────────────────`;

      // Tenta enviar para ambos os formatos do seu número
      for (const jid of OWNER_JIDS) {
        try {
          await socket.sendMessage(jid, {
            text: reportMessage,
            mentions: [senderNumber],
          });
        } catch (err) {
          console.error(`Falha ao enviar para o JID ${jid}:`, err.message);
        }
      }

      // Resposta de confirmação para o usuário
      const confirmationText = 
        `✅ *Mensagem enviada com sucesso!*\n\n` +
        `Sua mensagem (\`${PREFIX}${cmd}\`) foi entregue diretamente ao desenvolvedor. Obrigado pela contribuição! 🤖✨`;

      await sendReply(confirmationText);
    } catch (error) {
      console.error("Erro ao enviar feedback/report:", error);
      await sendErrorReply("❌ Ocorreu um erro ao tentar enviar sua mensagem ao suporte.");
    }
  },
};
