/*
Comando para fazer o bot enviar audio.
*/

import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";

export default {
  name: "falar",
  description: "Converte um texto digitado em uma mensagem de voz/áudio compatível com iOS e Android",
  commands: ["falar", "say", "tts", "voz"],
  usage: `${PREFIX}falar [texto que deseja que o bot fale]`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    args,
    sendWaitReact,
    sendSuccessReact,
    sendErrorReply,
    sendAudioFromURL,
  }) => {
    const textToSpeech = args.join(" ").trim();

    if (!textToSpeech) {
      throw new WarningError(
        `❌ Por favor, digite o texto que você deseja que eu fale.\nExemplo: \`${PREFIX}falar Olá, tudo bem com você?\``
      );
    }

    if (textToSpeech.length > 300) {
      throw new WarningError(
        `❌ O texto é muito longo! Por favor, digite uma mensagem de até 300 caracteres.`
      );
    }

    await sendWaitReact();

    try {
      // API pública de TTS (Google Translate TTS API em português do Brasil)
      const encodedText = encodeURIComponent(textToSpeech);
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=pt-BR&client=tw-ob`;

      // O parâmetro 'true' como segundo argumento envia o áudio como PTT (Nota de Voz / Pressionar para falar)
      // garantindo que seja convertido internamente para OGG/Opus compatível com o reprodutor do iPhone.
      await sendAudioFromURL(audioUrl, true);

      await sendSuccessReact();
    } catch (error) {
      console.error("Erro ao gerar áudio de voz:", error);
      await sendErrorReply("❌ Ocorreu um erro ao gerar a nota de voz.");
    }
  },
};
