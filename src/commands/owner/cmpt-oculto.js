/**
 * Gerencia e exibe uma lista personalizada de comandos ocultos (apenas dono).
 * Salva os dados em JSON para não perder ao reiniciar o bot.
 */

import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { OWNER_LID, PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Salva em database/cmpt-oculto.json (na raiz do projeto)
const DATA_FILE = path.resolve(__dirname, "../../../database/cmpt-oculto.json");

async function loadData() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      customText: typeof parsed.customText === "string" ? parsed.customText : "",
    };
  } catch {
    return { items: [], customText: "" };
  }
}

async function saveData(data) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

export default {
  name: "cmpt-oculto",
  description: "Exibe e permite editar a lista de comandos ocultos (apenas dono).",
  commands: ["cmpt-oculto", "cmpt-ocultos"],
  usage: `${PREFIX}cmpt-oculto [add|del|set|limpar]`,

  handle: async ({
    args,
    fullArgs,
    userLid,
    sendSuccessReply,
    sendErrorReply,
  }) => {
    try {
      if (userLid !== OWNER_LID) {
        throw new WarningError(
          "Apenas o proprietário do bot pode usar este comando."
        );
      }

      const sub = (args[0] || "").toLowerCase();
      const data = await loadData();

      // Pega o texto que vem depois do subcomando (mantendo quebras de linha)
      const rawContent =
        typeof fullArgs === "string"
          ? fullArgs.replace(/^\S+\s*/, "").trim()
          : args.slice(1).join(" ").trim();

      // 1. Adicionar item na lista numerada
      if (sub === "add" || sub === "adicionar") {
        if (!rawContent) {
          return await sendErrorReply(
            `Escreva o que quer adicionar.\nExemplo: \`${PREFIX}cmpt-oculto add !buckshot - Jogo da roleta\``
          );
        }

        // Se estava usando texto livre antes, limpa para voltar ao modo lista
        data.customText = "";
        data.items.push(rawContent);
        await saveData(data);

        return await sendSuccessReply(
          `✅ Adicionado na posição *#${data.items.length}*:\n${rawContent}`
        );
      }

      // 2. Remover item pelo número
      if (sub === "del" || sub === "remover" || sub === "rm") {
        const index = Number(args[1]) - 1;
        if (!Number.isInteger(index) || index < 0 || index >= data.items.length) {
          return await sendErrorReply(
            `Número inválido. Use \`${PREFIX}cmpt-oculto\` para ver os números da lista.`
          );
        }

        const [removed] = data.items.splice(index, 1);
        await saveData(data);

        return await sendSuccessReply(`🗑️ Removido da lista:\n${removed}`);
      }

      // 3. Substituir a lista inteira por um texto livre escrito por você
      if (sub === "set" || sub === "editar" || sub === "definir") {
        if (!rawContent) {
          return await sendErrorReply(
            `Mande o texto completo após \`set\`.\nExemplo:\n\`${PREFIX}cmpt-oculto set\`\n!cmd1 - descrição\n!cmd2 - descrição`
          );
        }

        data.items = [];
        data.customText = rawContent;
        await saveData(data);

        return await sendSuccessReply("✅ Lista de comandos ocultos atualizada!");
      }

      // 4. Limpar tudo
      if (sub === "limpar" || sub === "clear") {
        data.items = [];
        data.customText = "";
        await saveData(data);

        return await sendSuccessReply("🧹 Lista de comandos ocultos zerada.");
      }

      // 5. Exibir a lista atual (quando digita só !cmpt-oculto)
      const helpFooter =
        `\n\n━━━━━━━━━━━━━━━━━━\n` +
        `*Como editar:*\n` +
        `• \`${PREFIX}cmpt-oculto add <texto>\`\n` +
        `• \`${PREFIX}cmpt-oculto del <número>\`\n` +
        `• \`${PREFIX}cmpt-oculto set <lista completa>\`\n` +
        `• \`${PREFIX}cmpt-oculto limpar\``;

      if (data.customText) {
        return await sendSuccessReply(
          `👻 *COMANDOS OCULTOS*\n\n${data.customText}${helpFooter}`
        );
      }

      if (!data.items.length) {
        return await sendSuccessReply(
          `👻 *COMANDOS OCULTOS*\n\n_(Lista vazia no momento)_${helpFooter}`
        );
      }

      const formattedList = data.items
        .map((item, i) => `${i + 1}. ${item}`)
        .join("\n");

      return await sendSuccessReply(
        `👻 *COMANDOS OCULTOS (${data.items.length})*\n\n${formattedList}${helpFooter}`
      );
    } catch (error) {
      await sendErrorReply(
        error.message || "Erro ao gerenciar a lista de comandos ocultos."
      );
    }
  },
};
