/*
Configurações do comando de sticker.
- Imagem/GIF: cria a figurinha direto.
- Vídeo: cria a figurinha normal ou com áudio (quando pedir áudio/som).
*/

import { PREFIX } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";
import { createSticker } from "../../services/sticker.js";
import { createSoundSticker } from "../../services/soundSticker.js";

const AUDIO_COMMANDS = new Set([
  "sticker-audio",
  "stickeraudio",
  "fig-audio",
  "figaudio",
  "s-audio",
  "saudio",
  "audiofig",
  "audio-fig",
  "figurinha-audio",
  "figurinhaaudio",
  "sound-sticker",
  "soundsticker",
]);

function requestedAudio(paramsHandler) {
  const cmd = String(paramsHandler?.commandName || "").toLowerCase().trim();
  if (AUDIO_COMMANDS.has(cmd)) return true;

  const argsText = [
    paramsHandler?.args,
    Array.isArray(paramsHandler?.args) ? paramsHandler.args.join(" ") : "",
    paramsHandler?.fullArgs,
    paramsHandler?.text,
  ]
    .filter((v) => typeof v === "string" && v.trim())
    .join(" ")
    .toLowerCase();

  return /\b(audio|áudio|som)\b/.test(argsText);
}

export default {
  name: "sticker",
  description:
    "Cria figurinhas de imagem, gif ou vídeo. Use com áudio para gerar figurinha sonora.",
  commands: [
    "f",
    "s",
    "sticker",
    "fig",
    "figurinha",
    "figu",
    "sticker-audio",
    "stickeraudio",
    "fig-audio",
    "figaudio",
    "figurinha-audio",
    "figurinhaaudio",
    "sound-sticker",
    "soundsticker",
  ],
  usage: `${PREFIX}fig (imagem/gif/vídeo) ou ${PREFIX}fig audio (vídeo com som)`,
  /**
   * @param {CommandHandleProps} paramsHandler
   */
  handle: async (paramsHandler) => {
    const {
      isImage,
      isVideo,
      sendWaitReact,
      sendSuccessReact,
      reply,
    } = paramsHandler;

    const wantsAudio = requestedAudio(paramsHandler);

    if (wantsAudio) {
      if (!isVideo) {
        throw new InvalidParameterError(
          `Responda a um vídeo com áudio ou use ${PREFIX}fig audio na legenda dele.`
        );
      }

      await sendWaitReact();
      await createSoundSticker(paramsHandler);
      await sendSuccessReact();
      return;
    }

    if (!isImage && !isVideo) {
      throw new InvalidParameterError(
        `Você precisa marcar ou responder a uma imagem/gif/vídeo!`
      );
    }

    await sendWaitReact();
    await createSticker(paramsHandler);
    await sendSuccessReact();

    if (isVideo && reply) {
      await reply(
        `Quer que esse vídeo vire *figurinha com áudio*? Use *${PREFIX}fig audio* (ou *${PREFIX}stickeraudio*) no vídeo.`
      );
    }
  },
};
