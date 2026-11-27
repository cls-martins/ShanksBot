import crypto from "crypto";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "antiPhotoSpamConfig.json");

// Histórico recente: chave `${groupJid}:${senderKey}` -> { sig, count, keys, firstSeen, lastSeen }
const recentPhotos = new Map();

// Fila serial por chave `${groupJid}:${senderKey}` pra evitar corrida em rajadas de encaminhamento
const userQueues = new Map();

// Cache curto de groupMetadata por grupo (15s) pra não travar em rajadas de fotos
const metadataCache = new Map();
const METADATA_TTL_MS = 15_000;

const DEFAULT_CONFIG = {
  enabled: false,
  maxRepeats: 3,      // Limite da mesma foto dentro da janela
  windowMs: 30_000,   // Janela de 30 segundos
  autoBan: true,
};

let configCache = null;

function loadAllConfigs() {
  if (configCache) return configCache;
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      configCache = JSON.parse(raw || "{}");
      return configCache;
    }
  } catch (err) {
    console.error("[ANTI-FOTO] Erro ao ler config:", err.message);
  }
  configCache = {};
  return configCache;
}

function saveAllConfigs(all) {
  configCache = all;
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.error("[ANTI-FOTO] Erro ao salvar config:", err.message);
  }
}

export function getAntiPhotoConfig(groupJid) {
  const all = loadAllConfigs();
  return { ...DEFAULT_CONFIG, ...(all[groupJid] || {}) };
}

export function setAntiPhotoConfig(groupJid, patch = {}) {
  const all = loadAllConfigs();
  const updated = { ...DEFAULT_CONFIG, ...(all[groupJid] || {}), ...patch };
  all[groupJid] = updated;
  saveAllConfigs(all);
  return updated;
}

function normalizeJid(jid) {
  if (!jid || typeof jid !== "string") return "";
  if (jid.includes(":")) {
    const [left, right] = jid.split("@");
    return right ? `${left.split(":")[0]}@${right}` : left.split(":")[0];
  }
  return jid.trim();
}

function extractDigits(val) {
  return String(val || "").split("@")[0].split(":")[0].replace(/\D/g, "");
}

function formatTag(jid) {
  return `@${extractDigits(jid) || String(jid || "").split("@")[0]}`;
}

function sameId(a, b) {
  if (!a || !b) return false;
  if (normalizeJid(a) === normalizeJid(b)) return true;
  const da = extractDigits(a);
  const db = extractDigits(b);
  return Boolean(da && db && da === db);
}

function extractImageMessage(webMessage) {
  const msg = webMessage?.message;
  if (!msg) return null;

  return (
    msg.imageMessage ||
    msg.ephemeralMessage?.message?.imageMessage ||
    msg.viewOnceMessage?.message?.imageMessage ||
    msg.viewOnceMessageV2?.message?.imageMessage ||
    msg.viewOnceMessageV2Extension?.message?.imageMessage ||
    msg.documentWithCaptionMessage?.message?.imageMessage ||
    msg.associatedChildMessage?.message?.imageMessage ||
    null
  );
}

function shaToHex(rawSha) {
  if (!rawSha) return "";
  if (typeof rawSha === "string") return rawSha;
  if (Buffer.isBuffer(rawSha)) return rawSha.toString("hex");
  if (rawSha instanceof Uint8Array || Array.isArray(rawSha)) {
    return Buffer.from(rawSha).toString("hex");
  }
  if (typeof rawSha === "object") {
    const keys = Object.keys(rawSha)
      .filter((k) => /^\d+$/.test(k))
      .sort((a, b) => Number(a) - Number(b));
    if (keys.length > 0) {
      return Buffer.from(keys.map((k) => rawSha[k])).toString("hex");
    }
  }
  return "";
}

function getImageSignature(imageMsg) {
  const shaHex = shaToHex(imageMsg?.fileSha256);
  const fileLen = Number(imageMsg?.fileLength?.low ?? imageMsg?.fileLength ?? 0);
  const w = Number(imageMsg?.width || 0);
  const h = Number(imageMsg?.height || 0);

  const physical = fileLen > 0 ? `${fileLen}:${w}x${h}` : "";
  if (!shaHex && !physical) return null;

  return { shaHex, physical };
}

function isSameImage(sigA, sigB) {
  if (!sigA || !sigB) return false;
  if (sigA.shaHex && sigB.shaHex && sigA.shaHex === sigB.shaHex) return true;
  if (sigA.physical && sigB.physical && sigA.physical === sigB.physical) return true;
  return false;
}

async function getCachedMetadata(socket, groupJid) {
  const now = Date.now();
  const cached = metadataCache.get(groupJid);
  if (cached && now - cached.fetchedAt <= METADATA_TTL_MS) {
    return cached.data;
  }
  const data = await socket.groupMetadata(groupJid);
  metadataCache.set(groupJid, { data, fetchedAt: now });
  return data;
}

function resolveParticipantJid(groupMetadata, senderJid) {
  const participants = groupMetadata?.participants || [];
  const match = participants.find(
    (p) => sameId(p.id, senderJid) || sameId(p.lid, senderJid) || sameId(p.jid, senderJid)
  );
  return normalizeJid(match?.id || match?.jid || senderJid);
}

function isBotAdmin(groupMetadata, socket) {
  const participants = groupMetadata?.participants || [];
  const botId = normalizeJid(socket?.user?.id || "");
  const botLid = normalizeJid(socket?.user?.lid || "");

  const found = participants.find((p) => {
    return (
      sameId(p.id, botId) ||
      sameId(p.lid, botId) ||
      sameId(p.jid, botId) ||
      (botLid && (sameId(p.id, botLid) || sameId(p.lid, botLid) || sameId(p.jid, botLid)))
    );
  });

  if (found) {
    return found.admin === "admin" || found.admin === "superadmin";
  }
  return true;
}

function isSenderAdmin(groupMetadata, senderJid) {
  const participants = groupMetadata?.participants || [];
  return participants.some((p) => {
    const isUser =
      sameId(p.id, senderJid) || sameId(p.lid, senderJid) || sameId(p.jid, senderJid);
    if (!isUser) return false;
    return p.admin === "admin" || p.admin === "superadmin";
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deleteMessageKeys(socket, remoteJid, keys = []) {
  const seenIds = new Set();
  for (const key of keys) {
    if (!key?.id || seenIds.has(key.id)) continue;
    seenIds.add(key.id);
    try {
      await socket.sendMessage(remoteJid, { delete: key });
      await sleep(120);
    } catch {
      // ignora erro individual ao apagar mensagem antiga
    }
  }
}

function enqueueForKey(queueKey, taskFn) {
  const prev = userQueues.get(queueKey) || Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(taskFn);

  userQueues.set(queueKey, next);
  next.finally(() => {
    if (userQueues.get(queueKey) === next) {
      userQueues.delete(queueKey);
    }
  });

  return next;
}

async function processPhotoMessage({ socket, webMessage, remoteJid, userLid }) {
  if (!remoteJid?.endsWith("@g.us")) return false;
  if (webMessage?.key?.fromMe) return false;

  const imageMsg = extractImageMessage(webMessage);
  if (!imageMsg) return false;

  const config = getAntiPhotoConfig(remoteJid);
  if (!config.enabled) return false;

  const rawSender =
    userLid ||
    webMessage?.key?.participant ||
    webMessage?.participant ||
    "";
  const senderJid = normalizeJid(rawSender);
  if (!senderJid) return false;

  const sig = getImageSignature(imageMsg);
  if (!sig) return false;

  const senderKey = extractDigits(senderJid) || senderJid;
  const key = `${remoteJid}:${senderKey}`;

  return enqueueForKey(key, async () => {
    let metadata = null;
    try {
      metadata = await getCachedMetadata(socket, remoteJid);
    } catch (e) {
      console.error("[ANTI-FOTO] Erro ao buscar metadata:", e.message);
      return false;
    }

    if (isSenderAdmin(metadata, senderJid)) {
      return false;
    }

    const now = Date.now();
    const prev = recentPhotos.get(key);

    let entry;
    if (prev && isSameImage(prev.sig, sig) && now - prev.lastSeen <= config.windowMs) {
      const nextKeys = [...(prev.keys || [])];
      if (webMessage?.key) nextKeys.push(webMessage.key);
      entry = {
        ...prev,
        count: prev.count + 1,
        keys: nextKeys,
        lastSeen: now,
      };
    } else {
      entry = {
        sig,
        count: 1,
        keys: webMessage?.key ? [webMessage.key] : [],
        firstSeen: now,
        lastSeen: now,
      };
    }

    recentPhotos.set(key, entry);

    if (entry.count < config.maxRepeats) {
      return false;
    }

    // Pega todas as mensagens repetidas acumuladas e limpa o registro atual
    const keysToDelete = [...(entry.keys || [])];
    const totalCount = entry.count;
    recentPhotos.delete(key);

    const targetJid = resolveParticipantJid(metadata, senderJid);

    if (!config.autoBan) {
      await deleteMessageKeys(socket, remoteJid, keysToDelete);
      await socket.sendMessage(remoteJid, {
        text: `⚠️ *SPAM DE FOTO DETECTADO!*\n${formatTag(targetJid)} enviou a mesma foto *${totalCount}x* seguidas.`,
        mentions: [targetJid],
      });
      return true;
    }

    if (!isBotAdmin(metadata, socket)) {
      await socket.sendMessage(remoteJid, {
        text: `⚠️ ${formatTag(targetJid)} enviou a mesma foto *${totalCount}x* em sequência, mas eu não tenho *ADM* neste grupo para banir.`,
        mentions: [targetJid],
      });
      return true;
    }

    // Apaga todas as mensagens daquela foto repetida antes de remover
    await deleteMessageKeys(socket, remoteJid, keysToDelete);

    try {
      await socket.groupParticipantsUpdate(remoteJid, [targetJid], "remove");
      metadataCache.delete(remoteJid);

      await socket.sendMessage(remoteJid, {
        text: `🔨 *BAN POR SPAM DE FOTO!*\n${formatTag(targetJid)} foi removido por mandar a mesma imagem *${totalCount}x* em curto intervalo.`,
        mentions: [targetJid],
      });
    } catch (banErr) {
      console.error("[ANTI-FOTO] Falha ao remover participante:", banErr?.message || banErr);
      await socket.sendMessage(remoteJid, {
        text: `⚠️ ${formatTag(targetJid)} enviou a mesma foto *${totalCount}x* em sequência, mas não consegui remover (verifique se eu tenho *ADM*).`,
        mentions: [targetJid],
      });
    }

    return true;
  });
}

export async function handleAntiPhotoSpam({ socket, webMessage, remoteJid, userLid }) {
  try {
    return await processPhotoMessage({ socket, webMessage, remoteJid, userLid });
  } catch (err) {
    console.error("[ANTI-FOTO] Erro inesperado:", err);
    return false;
  }
}
