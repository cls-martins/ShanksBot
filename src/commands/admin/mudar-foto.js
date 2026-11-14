/*
Muda a foto do grupo usando o bot.
*/

import fs from "node:fs";
import path from "node:path";
import Jimp from "jimp";
import { PREFIX, TEMP_DIR } from "../../config.js";
import { getRandomName } from "../../utils/index.js";

export default {
  name: "mudar-foto",
  description: "Altera a foto de perfil do grupo (Apenas Admins)",
  commands: ["mudar-foto", "setgroupicon", "setpfp"],
  usage: `${PREFIX}mudar-foto (enviar imagem com a legenda ou responder a uma imagem)`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    isGroup,
    isImage,
    downloadImage,
    webMessage,
    socket,
    remoteJid,
    sendSuccessReact,
    sendErrorReply,
    sendSuccessReply,
    userJid,
  }) => {
    if (!isGroup) {
      return await sendErrorReply("❌ Este comando só pode ser utilizado em grupos!");
    }

    try {
      // 1. Validação de Administrador em tempo real
      const groupMetadata = await socket.groupMetadata(remoteJid);
      const participants = groupMetadata.participants || [];
      const senderJid = webMessage.key.participant || webMessage.key.remoteJid || userJid;

      const cleanJid = (jid) => (jid ? jid.split(":")[0].split("@")[0] : "");
      const cleanedSender = cleanJid(senderJid);

      const senderParticipant = participants.find(
        (p) => cleanJid(p.id) === cleanedSender
      );

      const isSenderAdmin =
        !!senderParticipant?.admin ||
        senderParticipant?.admin === "admin" ||
        senderParticipant?.admin === "superadmin";

      if (!isSenderAdmin) {
        return await sendErrorReply(
          "⚠️ Apenas administradores do grupo podem utilizar este comando!"
        );
      }

      // 2. Captura da imagem (direta ou citação)
      const contextInfo = webMessage.message?.extendedTextMessage?.contextInfo;
      const quotedMessage = contextInfo?.quotedMessage;

      const hasDirectImage = !!webMessage.message?.imageMessage;
      const hasQuotedImage = !!quotedMessage?.imageMessage;

      if (!isImage && !hasDirectImage && !hasQuotedImage) {
        return await sendErrorReply(
          `Por favor, envie uma imagem com a legenda \`${PREFIX}mudar-foto\` ou responda a uma imagem existente com o comando.`
        );
      }

      await sendSuccessReact();

      let inputPath = null;
      let resizedPath = path.resolve(TEMP_DIR, getRandomName("jpg"));
      const targetMessage = hasQuotedImage ? { message: quotedMessage } : webMessage;

      // Download da imagem
      inputPath = await downloadImage(targetMessage, getRandomName("jpg"));

      if (!inputPath || !fs.existsSync(inputPath)) {
        return await sendErrorReply("❌ Falha ao baixar a imagem. Tente novamente.");
      }

      // Redimensiona para o tamanho ideal do perfil (640x640) usando Jimp
      const image = await Jimp.read(inputPath);
      await image.cover(640, 640).writeAsync(resizedPath);

      // Atualiza a foto de perfil do grupo
      await socket.updateProfilePicture(remoteJid, { url: resizedPath });

      // Limpeza de temporários
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(resizedPath)) fs.unlinkSync(resizedPath);

      await sendSuccessReply("🖼️ Foto do perfil do grupo alterada com sucesso!");
    } catch (error) {
      console.error("Erro ao alterar foto do grupo:", error);

      await sendErrorReply(
        "❌ Ocorreu um erro ao tentar alterar a foto do grupo. Verifique se o bot é admin e tente novamente."
      );
    }
  },
};
