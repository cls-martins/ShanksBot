/*
Aqui é onde fica as configurações do menu de audios.
*/

import path from "node:path";
import { ASSETS_DIR, PREFIX } from "../../config.js";
import { menuMessage } from "../../menu-audios.js";

export default {
  name: "menu-audios",
  description: "Menu de audios",
  commands: ["menu-audios", "audio", "audios"],
  usage: `${PREFIX}menu-audios`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    remoteJid,
    sendSuccessReact,
    sendImageFromFile,
    sendGifFromFile,
  }) => {
    await sendSuccessReact();

    await sendImageFromFile(
      path.join(ASSETS_DIR, "images", "takeshi-bot.png"),
      `\n\n${menuMessage(remoteJid)}`,
    );
  },
};
