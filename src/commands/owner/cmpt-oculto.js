/**
 * Lista comandos em src/member, src/admin e src/owner que têm
 * "cmpt-oculto" ou "cmpt-ocultos" citado no início do arquivo (apenas dono).
 */

import path from "node:path";
import fs from "node:fs/promises";

import { OWNER_LID, PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";

const SRC_DIR = path.resolve(process.cwd(), "src");
const TARGET_DIRS = ["member", "admin", "owner"];
const CODE_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);
const TOP_CHARS_LIMIT = 1500; // trechos iniciais do arquivo

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

function hasTopHiddenMarker(rawText) {
  const head = rawText.slice(0, TOP_CHARS_LIMIT);
  return /\bcmpt-ocultos?\b/i.test(head);
}

function extractCommandNames(rawText, fallbackName) {
  const names = new Set();

  const commandsArrayMatch = rawText.match(/\bcommands\s*:\s*\[([\s\S]*?)\]/i);
  if (commandsArrayMatch) {
    const items = commandsArrayMatch[1].match(/["'`]([^"'`]+)["'`]/g) || [];
    for (const item of items) {
      const clean = item.slice(1, -1).trim();
      if (clean) names.add(clean);
    }
  }

  const nameMatch = rawText.match(/\bname\s*:\s*["'`]([^"'`]+)["'`]/i);
  if (nameMatch) {
    const clean = nameMatch[1].trim();
    if (clean) names.add(clean);
  }

  if (!names.size && fallbackName) {
    names.add(fallbackName);
  }

  return Array.from(names);
}

export default {
  name: "cmpt-oculto",
  description:
    "Lista comandos de src/member, src/admin e src/owner marcados com cmpt-oculto/cmpt-ocultos no início (apenas dono).",
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

      await sendWaitReply(
        "Buscando comandos ocultos em `src/member`, `src/admin` e `src/owner`..."
      );

      const hiddenCommands = [];

      for (const folder of TARGET_DIRS) {
        const baseDir = path.join(SRC_DIR, folder);
        const files = await collectFiles(baseDir);

        for (const filePath of files) {
          const relPath = path.relative(SRC_DIR, filePath).split(path.sep).join("/");
          const baseName = path.basename(filePath, path.extname(filePath));

          let rawText = "";
          try {
            rawText = await fs.readFile(filePath, "utf8");
          } catch {
            continue;
          }

          if (!hasTopHiddenMarker(rawText)) {
            continue;
          }

          hiddenCommands.push({
            category: folder,
            file: `src/${relPath}`,
            names: extractCommandNames(rawText, baseName),
          });
        }
      }

      if (!hiddenCommands.length) {
        return await sendSuccessReply(
          "Nenhum comando com `cmpt-oculto` ou `cmpt-ocultos` no início foi encontrado em `member`, `admin` ou `owner`."
        );
      }

      const lines = hiddenCommands.map((item, idx) => {
        const cmds = item.names.map((n) => `${PREFIX}${n}`).join(", ");
        return `${idx + 1}. *${cmds}* [${item.category}]\n   ↳ \`${item.file}\``;
      });

      const response =
        `👻 *COMANDOS OCULTOS DOS MENUS (${hiddenCommands.length})*\n\n` +
        lines.join("\n\n");

      await sendSuccessReply(response);
    } catch (error) {
      await sendErrorReply(
        error.message || "Erro ao listar comandos ocultos."
      );
    }
  },
};
