/*
Comando para explicar sobre privacidade do bot

(caso o bot for usado para ser vendido)
obs: o bot não está trancando. Tranque as conversas manualmente.
*/

import { PREFIX } from "../../config.js";

export default {
  name: "privacidade",
  description: "Exibe os detalhes sobre a segurança e privacidade do bot no grupo",
  commands: ["priv", "privacidade", "seguranca"],
  usage: `${PREFIX}priv`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ sendReply, sendSuccessReact }) => {
    await sendSuccessReact();

    // Truque do "Ler mais..." do WhatsApp (caracteres invisíveis para criar o botão de expansão)
    const readMoreTrick = "\u200e".repeat(2000) + "\n";

    const privacyText = 
      `╭──────────────────────╮\n` +
      `│🔐| Segurança & Privacidade do Bot │\n` +
      `╰──────────────────────╯\n` +
      readMoreTrick +
      ` \n` +
      `> *Ao ativar o bot em um grupo/conversa, o Bot passa automaticamente para o modo protegido.*\n\n` +
      `=================================\n\n` +
      `• O grupo/conversa deixa de aparecer para o proprietário do número responsável pelo bot.\n\n` +
      `• Atividades realizadas na conversa tornam-se invisíveis para ele.\n\n` +
      `• Esse mecanismo foi desenvolvido para garantir mais privacidade aos usuários.\n\n` +
      `• O bot utiliza a opção "Conversas Trancadas" com um código gerado aleatoriamente, o dono só passa a ter acesso ao grupo/conversa quando o suporte é solicitado.\n\n` +
      `=================================`;

    await sendReply(privacyText);
  },
};
