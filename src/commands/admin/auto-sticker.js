/*
Faz administradores do grupo ativarem a figurinha automatica.

Comando não está visivel. 
Use (seu-prefixo + cmpt-ocultos) sendo dono do bot.
*/

import { PREFIX } from "../../config.js";
import { InvalidParameterError, WarningError } from "../../errors/index.js";
import {
  activateAutoStickerGroup,
  deactivateAutoStickerGroup,
  isActiveAutoStickerGroup,
} from "../../utils/database.js";
import { isFalse, isTrue } from "../../utils/index.js";

export default {
  name: "auto-sticker",
  description: "Ativa/desativa o recurso de auto-figurinha no grupo. O bot envia figurinha da imagem sem precisar usar o comando de sticker.",
  commands: ["auto-sticker", "auto-figu", "auto-fig", "auto-stick"],
  usage: `${PREFIX}auto-sticker (1/0)`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ args, sendReply, sendSuccessReact, remoteJid }) => {
    if (!args.length) {
      throw new InvalidParameterError(
        "Você precisa digitar 1 ou 0 (ligar ou desligar)!",
      );
    }

    const autoStickerOn = isTrue(args[0]);
    const autoStickerOff = isFalse(args[0]);

    if (!autoStickerOn && !autoStickerOff) {
      throw new InvalidParameterError(
        "Você precisa digitar 1 ou 0 (ligar ou desligar)!",
      );
    }

    const hasActive = autoStickerOn && isActiveAutoStickerGroup(remoteJid);
    const hasInactive = autoStickerOff && !isActiveAutoStickerGroup(remoteJid);

    if (hasActive || hasInactive) {
      throw new WarningError(
        `O recurso de auto-figurinha já está ${
          autoStickerOn ? "ativado" : "desativado"
        }!`,
      );
    }

    if (autoStickerOn) {
      activateAutoStickerGroup(remoteJid);
    } else {
      deactivateAutoStickerGroup(remoteJid);
    }

    await sendSuccessReact();

    const context = autoStickerOn ? "ativado" : "desativado";
    await sendReply(`Recurso de auto-figurinha ${context} com sucesso!`);
  },
};
