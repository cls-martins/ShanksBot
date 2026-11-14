/*
Aqui é onde fica as configurações do menu de busca.
*/

import path from "node:path";
import { ASSETS_DIR, PREFIX } from "../../config.js";
import { menuMessage } from "../../menu-busca.js";

export default {
  name: "menu-busca",
  description: "Menu de busca",
  commands: ["menu-busca", "buscar", "busca"],
  usage: `${PREFIX}menu-busca`,
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
