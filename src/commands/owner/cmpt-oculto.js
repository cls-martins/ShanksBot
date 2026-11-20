/**
 * Lista comandos ocultos dos menus dentro da pasta src (apenas dono).
 */

import path from "node:path";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { OWNER_LID, PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";

const SRC_DIR = path.resolve(process.cwd(), "src");
const CODE_EXTENSIONS = new Set([".js", ".mjs"]);

async function collectFiles(dir) {
  const results = [];
  let entries = [];

  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const nested = await collectFiles(fullPath);
      results.push(...nested);
    } else if (
      entry.isFile() &&
      CODE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    ) {
      results.push(fullPath);
    }
  }

  return results;
}

function hasHiddenFlag(obj, rawText = "") {
  if (obj && typeof obj === "object") {
    if (
      obj.hidden === true ||
      obj.hideInMenu === true ||
      obj.hiddenInMenu === true ||
      obj.oculto === true ||
      obj.menu === false ||
      obj.showInMenu === false
    ) {
      return true;
    }
  }

  return /\b(hidden|hideInMenu|hiddenInMenu|oculto)\s*:\s*true\b|\b(menu|showInMenu)\s*:\s*false\b/i.test(
    rawText
  );
}

function extractCommandsFromText(rawText, fallbackName) {
  const found = new Set();

  const commandsArrayMatch = rawText.match(/\bcommands\s*:\s*\[([\s\S]*?)\]/i);
  if (commandsArrayMatch) {
    const items = commandsArrayMatch[1].match(/["'`]([^"'`]+)["'`]/g) || [];
    for (const item of items) {
      found.add(item.slice(1, -1).trim());
    }
  }

  const nameMatch = rawText.match(/\bname\s*:\s*["'`]([^"'`]+)["'`]/i);
  if (nameMatch) {
    found.add(nameMatch[1].trim());
  } else if (fallbackName) {
    found.add(fallbackName);
  }

  return Array.from(found).filter(Boolean);
}

async function inspectFile(filePath) {
  const relPath = path.relative(SRC_DIR, filePath).split(path.sep).join("/");
  const baseName = path.basename(filePath, path.extname(filePath));
  let rawText = "";

  try {
    rawText = await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }

  let mod = null;
  try {
    const fileUrl = `${pathToFileURL(filePath).href}?t=${Date.now()}`;
    mod = await import(fileUrl);
  } catch {
    // Fallback para leitura estática se a importação isolada falhar
  }

  const cmdObj =
    mod?.default && typeof mod.default === "object" ? mod.default : null;
  const hiddenByFlag = hasHiddenFlag(cmdObj, rawText);
  const hiddenByPath = /(^|\/)(hidden|ocultos?|secret|private|dev|owner)\//i.test(
    relPath
  );

  if (!hiddenByFlag && !hiddenByPath) {
    return null;
  }

  let commands = [];
  if (Array.isArray(cmdObj?.commands) && cmdObj.commands.length > 0) {
    commands = cmdObj.commands.map((c) => String(c).trim()).filter(Boolean);
  } else if (cmdObj?.name) {
    commands = [String(cmdObj.name).trim()];
  } else {
    commands = extractCommandsFromText(rawText, baseName);
  }

  const reason = hiddenByFlag ? "flag oculto" : "pasta/rota oculta";

  return {
    file: `src/${relPath}`,
    commands,
    reason,
  };
}

export default {
  name: "cmpt-oculto",
  description: "Lista comandos ocultos dos menus dentro da pasta src (apenas dono).",
  commands: ["cmpt-oculto", "cmpt-ocultos"],
  usage: `${PREFIX}cmpt-oculto`,

  handle: async ({
    userLid,
    sendWaitReply,
    sendSuccessReply,
    sendErrorReply,
  }) => {
    try {
      if (userLid !== OWNER_LID) {
        throw new WarningError(
          "Apenas o proprietário do bot pode usar este comando."
        );
      }

      await sendWaitReply("Varrendo `src` em busca de comandos ocultos...");

      const files = await collectFiles(SRC_DIR);
      const hiddenItems = [];

      for (const file of files) {
        const inspected = await inspectFile(file);
        if (inspected) {
          hiddenItems.push(inspected);
        }
      }

      if (!hiddenItems.length) {
        return await sendSuccessReply(
          "Nenhum comando oculto de menu foi encontrado dentro de `src`."
        );
      }

      const lines = hiddenItems.map((item, idx) => {
        const cmds = item.commands.length
          ? item.commands.map((c) => `${PREFIX}${c}`).join(", ")
          : "(sem nome/comando identificado)";
        return `${idx + 1}. *${cmds}*\n   ↳ Arquivo: \`${item.file}\` (${item.reason})`;
      });

      const response =
        `👻 *COMANDOS OCULTOS DOS MENUS (${hiddenItems.length})*\n\n` +
        lines.join("\n\n");

      await sendSuccessReply(response);
    } catch (error) {
      await sendErrorReply(
        error.message || "Erro ao verificar comandos ocultos em `src`."
      );
    }
  },
};
