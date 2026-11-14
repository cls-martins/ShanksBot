/*
Aqui é onde fica as configuração do menu de brincadeiras.
*/

import path from "node:path";
import { ASSETS_DIR, PREFIX } from "../../config.js";
import { menuMessage } from "../../menu-brincadeiras.js";

export default {
  name: "menu-brincadeiras",
  description: "Menu de brincadeiras",
  commands: ["menu-brincadeira", "menu-brincadeiras", "brincar", "brincadeira", "brinks", "brincadeiras"],
  usage: `${PREFIX}menu-brincadeiras`,
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
