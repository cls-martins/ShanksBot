/*
Comando de brincadeiras para ver o "perfil" de membros.
*/

import { ASSETS_DIR, PREFIX } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";
import { getProfileImageData } from "../../services/baileys.js";
import { isGroup, onlyNumbers } from "../../utils/index.js";
import { errorLog } from "../../utils/logger.js";

export default {
  name: "perfil",
  description: "Mostra informações de um usuário",
  commands: ["perfil", "profile"],
  usage: `${PREFIX}perfil ou perfil @usuario`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    args,
    socket,
    remoteJid,
    userLid,
    sendErrorReply,
    sendWaitReply,
    sendSuccessReact,
  }) => {
    if (!isGroup(remoteJid)) {
      throw new InvalidParameterError(
        "Este comando só pode ser usado em grupo."
      );
    }

    const targetLid = args[0] ? `${onlyNumbers(args[0])}@lid` : userLid;

    await sendWaitReply("Carregando perfil...");

    try {
      let profilePicUrl;
      let userRole = "Membro";

      try {
        const { profileImage } = await getProfileImageData(socket, targetLid);
        profilePicUrl = profileImage || `${ASSETS_DIR}/images/default-user.png`;
      } catch (error) {
        errorLog(
          `Erro ao tentar pegar dados do usuário ${targetLid}: ${JSON.stringify(
            error,
            null,
            2
          )}`
        );
        profilePicUrl = `${ASSETS_DIR}/images/default-user.png`;
      }

      const groupMetadata = await socket.groupMetadata(remoteJid);

      const participant = groupMetadata.participants.find(
        (participant) => participant.id === targetLid
      );

      if (participant?.admin) {
        userRole = "Administrador";
      }

      // Estatísticas originais
      const randomPercent = Math.floor(Math.random() * 100);
      const programPrice = (Math.random() * 5000 + 1000).toFixed(2);
      const beautyLevel = Math.floor(Math.random() * 100) + 1;

      // Novas estatísticas solicitadas
      const atraente = Math.floor(Math.random() * 101);
      const inteligente = Math.floor(Math.random() * 101);
      const rico = Math.floor(Math.random() * 101);
      const pobre = Math.floor(Math.random() * 101);
      const estressado = Math.random() > 0.5 ? "Sim" : "Não";

      // Lógica da Aura (valores de 50k a 800k ou -1 a -10%)
      let auraVal = "";
      if (Math.random() > 0.3) {
        const kVal = Math.floor(Math.random() * (800 - 50 + 1)) + 50;
        auraVal = `+${kVal}k`;
      } else {
        const negVal = Math.floor(Math.random() * 10) + 1;
        auraVal = `-${negVal}%`;
      }

      const mensagem = `
👤 *Nome:* @${targetLid.split("@")[0]}
🎖️ *Cargo:* ${userRole}

🌚 *Programa:* R$ ${programPrice}
🐮 *Gado:* ${randomPercent + 7 || 5}%
✨ *Beleza:* ${beautyLevel}%

🔮 *Estatísticas:*
✨ *Atraente:* ${atraente}%
🧠 *Inteligente:* ${inteligente}%
💰 *Rico:* ${rico}%
💸 *Pobre:* ${pobre}%
😡 *Estressado:* ${estressado}
⚡ *Aura:* ${auraVal}`;

      const mentions = [targetLid];

      await sendSuccessReact();

      await socket.sendMessage(remoteJid, {
        image: { url: profilePicUrl },
        caption: mensagem,
        mentions: mentions,
      });
    } catch (error) {
      console.error(error);
      sendErrorReply("Ocorreu um erro ao tentar verificar o perfil.");
    }
  },
};
