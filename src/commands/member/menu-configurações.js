/*
Aqui é onde fica a configuração do menu de configurações.
*/

import path from "node:path";
import { ASSETS_DIR, PREFIX } from "../../config.js";
import { menuMessage } from "../../menu-configurações.js";

export default {
  name: "menu-configurações",
  description: "Menu de configurações",
  commands: ["menu-config", "config", "conf", "menu-configurações", "menu-configuração", "configuração", "configurações"],
  usage: `${PREFIX}menu-config`,
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
