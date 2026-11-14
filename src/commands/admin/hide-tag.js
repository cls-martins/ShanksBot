/*
Faz o bot marcar todos com uma mensagem de "removeu você"
*/

import { PREFIX } from "../../config.js";

export default {
  name: "hide-tag",
  description: "Este comando marcará todos do grupo",
  commands: ["hide-tag", "to-tag", "marcar", "marca", "tag-all"],
  usage: `${PREFIX}hidetag motivo`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ fullArgs, sendText, socket, remoteJid, sendReact }) => {
    const { participants } = await socket.groupMetadata(remoteJid);
    const mentions = participants.map(({ id }) => id);
    await sendReact("📢");
    await sendText(`Removeu você...\n\n${fullArgs}`, mentions);
  },
};
