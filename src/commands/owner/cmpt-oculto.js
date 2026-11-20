/**
 * Lista comandos em pastas de comandos (member, admin, owner, etc.)
 * que não aparecem nos arquivos de menu dentro de src (apenas dono).
 * Lê apenas texto para não reexecutar módulos nem quebrar a conexão.
 */

import path from "node:path";
import fs from "node:fs/promises";

import { OWNER_LID, PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";

const SRC_DIR = path.resolve(process.cwd(), "src");
const CODE_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);

async function collectFiles(dir) {
  const results = [];
  let entries = [];

  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") {
      continue;
    }

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

function isMenuFile(relPathLower) {
  const base = path.basename(relPathLower);
  return (
    base.includes("menu") ||
    relPathLower.includes("/menu/") ||
    relPathLower.startsWith("menu/")
  );
}

function isCommandFile(relPathLower) {
  if (isMenuFile(relPathLower)) return false;
  if (relPathLower.endsWith("cmpt-oculto.js") || relPathLower.endsWith("cmpt-ocultos.js")) {
    return false;
  }

  return (
    relPathLower.includes("commands/") ||
    /(^|\/)(member|admin|owner|user|group|geral|diversao|jogos|utilidades)(\/|$)/.test(
      relPathLower
    )
  );
}

function extractCommandNames(rawText, fallbackName) {
  const names = new Set();

  const commandsArrayMatch = rawText.match(/\bcommands\s*:\s*\[([\s\S]*?)\]/i);
  if (commandsArrayMatch) {
    const items = commandsArrayMatch[1].match(/["'`]([^"'`]+)["'`]/g) || [];
    for (const item of items) {
      const clean = item.slice(1, -1).trim().toLowerCase();
      if (clean) names.add(clean);
    }
  }

  const nameMatch = rawText.match(/\bname\s*:\s*["'`]([^"'`]+)["'`]/i);
  if (nameMatch) {
    const clean = nameMatch[1].trim().toLowerCase();
    if (clean) names.add(clean);
  }

  if (!names.size && fallbackName) {
    names.add(fallbackName.toLowerCase());
  }

  return Array.from(names);
}

function collectMenuTokens(menuTexts) {
  const combined = menuTexts.join("\n").toLowerCase();
  const tokens = new Set();

  // Captura palavras após prefixos comuns usados em menus (!cmd, /cmd, .cmd, ${PREFIX}cmd)
  const prefixedMatches = combined.match(/(?:[!/.#$-]|\$\{prefix\})([a-z0-9_-]+)/gi) || [];
  for (const match of prefixedMatches) {
    const cleaned = match
      .replace(/^\$\{prefix\}/i, "")
      .replace(/^[!/.#$-]+/, "")
      .trim()
      .toLowerCase();
    if (cleaned) tokens.add(cleaned);
  }

  // Também guarda o texto completo em minúsculo para casar nomes soltos em listas de menu
  return { tokens, combined };
}

function isCommandInMenus(cmdName, menuData) {
  if (menuData.tokens.has(cmdName)) return true;

  // Escapa caracteres especiais para buscar palavra/comando no texto dos menus
  const escaped = cmdName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordRegex = new RegExp(`(^|[^a-z0-9_-])${escaped}([^a-z0-9_-]|$)`, "i");
  return wordRegex.test(menuData.combined);
}

export default {
  name: "cmpt-oculto",
  description:
    "Mostra comandos de member, admin, owner etc. que não aparecem nos menus dentro de src (apenas dono).",
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

      await sendWaitReply("Comparando comandos em `src` com os menus...");

      const allFiles = await collectFiles(SRC_DIR);
      const menuContents = [];
      const commandEntries = [];

      for (const filePath of allFiles) {
        const relPath = path.relative(SRC_DIR, filePath).split(path.sep).join("/");
        const relPathLower = relPath.toLowerCase();
        const baseName = path.basename(filePath, path.extname(filePath));

        let rawText = "";
        try {
          rawText = await fs.readFile(filePath, "utf8");
        } catch {
          continue;
        }

        if (isMenuFile(relPathLower)) {
          menuContents.push(rawText);
          continue;
        }

        if (isCommandFile(relPathLower)) {
          const names = extractCommandNames(rawText, baseName);
          commandEntries.push({
            file: `src/${relPath}`,
            names,
          });
        }
      }

      if (!menuContents.length) {
        return await sendErrorReply(
          "Não encontrei arquivos de menu dentro de `src` para comparar."
        );
      }

      const menuData = collectMenuTokens(menuContents);
      const hiddenCommands = [];

      for (const entry of commandEntries) {
        const visible = entry.names.some((name) => isCommandInMenus(name, menuData));
        if (!visible) {
          hiddenCommands.push(entry);
        }
      }

      if (!hiddenCommands.length) {
        return await sendSuccessReply(
          "Todos os comandos encontrados estão presentes nos menus de `src`!"
        );
      }

      const lines = hiddenCommands.map((item, idx) => {
        const formattedCmds = item.names.map((n) => `${PREFIX}${n}`).join(", ");
        return `${idx + 1}. *${formattedCmds}*\n   ↳ \`${item.file}\``;
      });

      const response =
        `👻 *COMANDOS FORA DOS MENUS (${hiddenCommands.length})*\n\n` +
        lines.join("\n\n");

      await sendSuccessReply(response);
    } catch (error) {
      await sendErrorReply(
        error.message || "Erro ao listar comandos ocultos dos menus."
      );
    }
  },
};
