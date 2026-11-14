/*
Esse comando faz os administradores dos grupos adicionarem ajudantes/staff nos grupos
podendo utilizar alguns comandos de administradores no bot. 

A parte de alterar nome, descrição, comandos está mais para baixo.
*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PREFIX } from "../../config.js";
import { WarningError, DangerError } from "../../errors/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "..", "..", "database", "helpers.json");

if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({}, null, 2), "utf-8");
}

function getAllHelpersData() {
  try {
    if (!fs.existsSync(dbPath)) return {};
    const data = fs.readFileSync(dbPath, "utf-8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) || !parsed ? {} : parsed;
  } catch (error) {
    console.error("Erro ao ler helpers.json:", error);
    return {};
  }
}

function saveHelpersData(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Erro ao escrever no helpers.json:", error);
  }
}

export function getHelpers(remoteJid) {
  const db = getAllHelpersData();
  return db[remoteJid] || [];
}

export function isHelper(remoteJid, jid) {
  if (!jid) return false;
  const helpers = getHelpers(remoteJid);
  const cleanJid = jid.replace(/[^0-9]/g, "");
  
  return helpers.some(h => h === jid || h.replace(/[^0-9]/g, "") === cleanJid);
}

export default {
  name: "ajudantes",
  description: "Gerencia os ajudantes do bot por grupo e suas permissões",
  commands: ["ajudantes", "ajudante", "subir-ajudante", "descer-ajudante"],
  usage: `${PREFIX}ajudantes | ${PREFIX}subir-ajudante @usuario | ${PREFIX}descer-ajudante @usuario`,
  handle: async ({
    socket,
    remoteJid,
    webMessage,
    isGroup,
    sendSuccessReact,
  }) => {
    if (!isGroup) {
      throw new DangerError("Este comando só pode ser usado em grupos.");
    }

    const db = getAllHelpersData();
    if (!db[remoteJid]) {
      db[remoteJid] = [];
    }
    const helpers = db[remoteJid];

    const messageText = 
      webMessage.message?.conversation ||
      webMessage.message?.extendedTextMessage?.text || "";
    
    const cleanText = messageText.trim().toLowerCase();
    
    let action = "listar";
    if (cleanText.includes("subir-ajudante") || cleanText.includes("subir")) {
      action = "subir";
    } else if (cleanText.includes("descer-ajudante") || cleanText.includes("descer") || cleanText.includes("rebaixar")) {
      action = "descer";
    }

    if (action === "listar") {
      const allowedCommands = "`!delete`, `!warn`, `!unwarn`, `!mute`, `!unmute`";
      
      let helpersText = "";
      if (helpers.length === 0) {
        helpersText = "📜 *Nenhum ajudante registrado neste grupo.*";
      } else {
        helpersText = helpers.map((h, i) => `${i + 1}. @${h.split("@")[0]}`).join("\n");
      }

      const infoText = 
        `🛡️ *SISTEMA DE AJUDANTES*\n\n` +
        `O sistema de ajudantes concede permissões de moderação parcial a membros comuns.\n\n` +
        `⚙️ *Comandos permitidos para ajudantes:*\n${allowedCommands}\n\n` +
        `📌 *Como utilizar:*\n` +
        `• \`${PREFIX}subir-ajudante @usuario\` -> Promove o membro.\n` +
        `• \`${PREFIX}descer-ajudante @usuario\` -> Rebaixa o membro.\n\n` +
        `📋 *Ajudantes deste grupo:*\n${helpersText}`;

      return await socket.sendMessage(
        remoteJid,
        {
          text: infoText,
          mentions: helpers,
        },
        { quoted: webMessage }
      );
    }

    const mentionedJid =
      webMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
      webMessage.message?.extendedTextMessage?.contextInfo?.participant;

    if (!mentionedJid) {
      throw new WarningError(
        `Marque ou responda a um usuário para usar este comando!\nExemplo: \`${PREFIX}${action === "subir" ? "subir-ajudante" : "descer-ajudante"} @usuario\``
      );
    }

    if (action === "subir") {
      if (helpers.includes(mentionedJid)) {
        throw new WarningError("Este usuário já é um ajudante neste grupo!");
      }
      helpers.push(mentionedJid);
      db[remoteJid] = helpers;
      saveHelpersData(db);

      await socket.sendMessage(
        remoteJid,
        {
          text: `@${mentionedJid.split("@")[0]} foi promovido a **Ajudante** deste grupo com sucesso!`,
          mentions: [mentionedJid],
        },
        { quoted: webMessage }
      );
    } else if (action === "descer") {
      if (!helpers.includes(mentionedJid)) {
        throw new WarningError("Este usuário não é um ajudante neste grupo!");
      }
      const index = helpers.indexOf(mentionedJid);
      helpers.splice(index, 1);
      db[remoteJid] = helpers;
      saveHelpersData(db);

      await socket.sendMessage(
        remoteJid,
        {
          text: `@${mentionedJid.split("@")[0]} foi rebaixado e não é mais ajudante deste grupo.`,
          mentions: [mentionedJid],
        },
        { quoted: webMessage }
      );
    }

    await sendSuccessReact();
  },
};
