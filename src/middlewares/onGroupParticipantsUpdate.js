/**
- Evento chamado quando um usuário
- entra ou sai de um grupo de WhatsApp.
 *
 */
import { getExitMessage, getWelcomeMessage } from "../messages.js";
import {
  isActiveExitGroup,
  isActiveGroup,
  isActiveWelcomeGroup,
} from "../utils/database.js";
import { extractUserLid, onlyNumbers } from "../utils/index.js";
import { errorLog } from "../utils/logger.js";

export async function onGroupParticipantsUpdate({
  data,
  remoteJid,
  socket,
  action,
}) {
  try {
    if (!remoteJid.endsWith("@g.us")) {
      return;
    }

    if (!isActiveGroup(remoteJid)) {
      return;
    }

    const userLid = extractUserLid(data);

    if (isActiveWelcomeGroup(remoteJid) && action === "add") {
      const { image, caption } = await getWelcomeMessage(socket, userLid);
      const hasMemberMention = caption.includes("@member");

      const mentions = [];
      let finalWelcomeMessage = caption;

      if (hasMemberMention) {
        const userNumber = onlyNumbers(userLid);
        finalWelcomeMessage = caption.replace("@member", `@${userNumber}`);
        mentions.push(userLid);
      }

      if (image) {
        await socket.sendMessage(remoteJid, {
          image,
          caption: finalWelcomeMessage,
          mentions,
        });
      } else {
        await socket.sendMessage(remoteJid, {
          text: finalWelcomeMessage,
          mentions,
        });
      }
    } else if (isActiveExitGroup(remoteJid) && action === "remove") {
      const { image, caption } = await getExitMessage(socket, userLid);
      const hasMemberMention = caption.includes("@member");

      const mentions = [];
      let finalExitMessage = caption;

      if (hasMemberMention) {
        const userNumber = onlyNumbers(userLid);
        finalExitMessage = caption.replace("@member", `@${userNumber}`);
        mentions.push(userLid);
      }

      if (image) {
        await socket.sendMessage(remoteJid, {
          image,
          caption: finalExitMessage,
          mentions,
        });
      } else {
        await socket.sendMessage(remoteJid, {
          text: finalExitMessage,
          mentions,
        });
      }
    }
  } catch (error) {
    errorLog(`Erro em onGroupParticipantsUpdate: ${error.message}`);
    errorLog(JSON.stringify(error, null, 2));
  }
}
