/*
Aqui é onde fica as configurações do menu de download.
*/

import path from "node:path";
import { ASSETS_DIR, PREFIX } from "../../config.js";
import { menuMessage } from "../../menu-downloads.js";

export default {
  name: "menu-downloads",
  description: "Menu de downloads",
  commands: ["menu-download", "menu-downloads", "download", "downloads", "baixar"],
  usage: `${PREFIX}menu-download`,
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
