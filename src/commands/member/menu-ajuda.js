/*
Aqui é onde fica as configurações do menu de ajuda.
*/

import path from "node:path";
import { ASSETS_DIR, PREFIX } from "../../config.js";
import { menuMessage } from "../../menu-ajuda.js";

export default {
  name: "menu-ajuda",
  description: "Menu de ajuda",
  commands: ["menu-ajuda", "ajuda", "help", "socorro", "scrr", "scr"],
  usage: `${PREFIX}menu-ajuda`,
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
