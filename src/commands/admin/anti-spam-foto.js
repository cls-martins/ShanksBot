/*
Comando para previnir spam de foto.
*/

import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";
import {
  getAntiPhotoConfig,
  setAntiPhotoConfig,
} from "../../utils/antiPhotoSpam.js";

function normalizeJid(jid) {
  if (!jid || typeof jid !== "string") return "";
  if (jid.includes(":")) {
    const [left, right] = jid.split("@");
    return right ? `${left.split(":")[0]}@${right}` : left.split(":")[0];
  }
  return jid.trim();
}

function sameId(a, b) {
  if (!a || !b) return false;
  if (normalizeJid(a) === normalizeJid(b)) return true;
  const da = String(a).split("@")[0].split(":")[0].replace(/\D/g, "");
  const db = String(b).split("@")[0].split(":")[0].replace(/\D/g, "");
  return Boolean(da && db && da === db);
}

export default {
  name: "antifotospam",
  description: "Ativa ou configura o ban automático para quem spamma a mesma foto no grupo.",
  commands: ["antifotospam", "antifoto", "anti-spam-foto"],
  usage: `${PREFIX}antifotospam <on|off|status|limite <qtd>|tempo <seg>>`,

  handle: async ({
    args = [],
    remoteJid,
    userLid,
    socket,
    sendReply,
    sendSuccessReply,
  }) => {
    if (!remoteJid?.endsWith("@g.us")) {
      throw new WarningError("Este comando só funciona em grupos.");
    }

    const metadata = await socket.groupMetadata(remoteJid);
    const participants = metadata?.participants || [];
    const sender = normalizeJid(userLid);

    const isAdmin = participants.some((p) => {
      const match = sameId(p.id, sender) || sameId(p.lid, sender) || sameId(p.jid, sender);
      return match && (p.admin === "admin" || p.admin === "superadmin");
    });

    if (!isAdmin) {
      throw new WarningError("Apenas *ADMs* do grupo podem configurar o anti-spam de foto.");
    }

    const sub = (args[0] || "status").toLowerCase();
    const cfg = getAntiPhotoConfig(remoteJid);

    if (sub === "on" || sub === "ligar" || sub === "ativar") {
      const updated = setAntiPhotoConfig(remoteJid, { enabled: true, autoBan: true });
      return await sendSuccessReply(
        `🛡️ *Anti-spam de foto ATIVADO!*\n• Limite: *${updated.maxRepeats}x* a mesma foto\n• Janela: *${Math.round(updated.windowMs / 1000)}s*\n• Ação: *Ban automático*`
      );
    }

    if (sub === "off" || sub === "desligar" || sub === "desativar") {
      setAntiPhotoConfig(remoteJid, { enabled: false });
      return await sendSuccessReply("⏸️ *Anti-spam de foto DESATIVADO* neste grupo.");
    }

    if (sub === "limite" || sub === "qtd") {
      const qtd = Number(args[1]);
      if (!Number.isInteger(qtd) || qtd < 2 || qtd > 10) {
        throw new WarningError(`Informe um limite entre *2* e *10*. Ex: \`${PREFIX}antifotospam limite 3\``);
      }
      const updated = setAntiPhotoConfig(remoteJid, { maxRepeats: qtd });
      return await sendSuccessReply(`✅ Limite de fotos repetidas atualizado para *${updated.maxRepeats}x*.`);
    }

    if (sub === "tempo" || sub === "segundos") {
      const seg = Number(args[1]);
      if (!Number.isInteger(seg) || seg < 5 || seg > 300) {
        throw new WarningError(`Informe um tempo entre *5* e *300* segundos. Ex: \`${PREFIX}antifotospam tempo 30\``);
      }
      const updated = setAntiPhotoConfig(remoteJid, { windowMs: seg * 1000 });
      return await sendSuccessReply(`✅ Janela de tempo atualizada para *${Math.round(updated.windowMs / 1000)}s*.`);
    }

    return await sendReply(
      `📊 *STATUS — ANTI-SPAM DE FOTO*\n` +
        `• Estado: *${cfg.enabled ? "ATIVADO" : "DESATIVADO"}*\n` +
        `• Limite: *${cfg.maxRepeats}x* a mesma foto\n` +
        `• Janela: *${Math.round(cfg.windowMs / 1000)}s*\n` +
        `• Ban automático: *${cfg.autoBan ? "Sim" : "Não"}*\n\n` +
        `Comandos:\n` +
        `\`${PREFIX}antifotospam on\` | \`${PREFIX}antifotospam off\`\n` +
        `\`${PREFIX}antifotospam limite 3\` | \`${PREFIX}antifotospam tempo 30\``
    );
  },
};
