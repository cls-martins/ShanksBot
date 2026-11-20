/**
 * Atualiza os arquivos do ShanksBot pelo WhatsApp.
 *
 * - Requer instalação via git clone e Git disponível no PATH.
 * - Preserva alterações locais por padrão e permite escolher quais ignorados atualizar.
 */

import path from "node:path";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { OWNER_LID, PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";

const exec = promisify(execFile);
const pendingSelections = new Map();
const SELECTION_TTL_MS = 5 * 60 * 1000; // 5 minutos

const normalizeRelPath = (file) => file.split(path.sep).join("/");

const git = async (args, cwd) => {
  const { stdout } = await exec("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    windowsHide: true,
  });

  return stdout;
};

const getRoot = async () =>
  (await git(["rev-parse", "--show-toplevel"], process.cwd())).trim();

const getTree = async (root, ref) => {
  const output = await git(["ls-tree", "-r", "-z", ref], root);
  const files = new Map();

  for (const entry of output.split("\0").filter(Boolean)) {
    const tab = entry.indexOf("\t");
    if (tab < 0) continue;

    const [, type, hash] = entry.slice(0, tab).split(" ");
    const file = normalizeRelPath(entry.slice(tab + 1));

    if (type === "blob") {
      files.set(file, { hash });
    }
  }

  return files;
};

const getBlob = async (root, hash) => {
  const { stdout } = await exec("git", ["cat-file", "blob", hash], {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 50 * 1024 * 1024,
    windowsHide: true,
  });

  return stdout;
};

const safePath = (root, file) => {
  const target = path.resolve(root, file);
  const relative = path.relative(root, target);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Caminho inválido: ${file}`);
  }

  return target;
};

const getChangedFiles = async (root, oldRef, newRef) => {
  const output = await git(
    ["diff", "--name-only", "-z", oldRef, newRef],
    root
  );

  return output
    .split("\0")
    .filter(Boolean)
    .map(normalizeRelPath);
};

const getProtectedFiles = async (root) => {
  const output = await git(
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    root
  );

  const protectedFiles = new Set();
  const entries = output.split("\0").filter(Boolean);

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const status = entry.slice(0, 2);
    const file = entry.slice(3);

    if (file) {
      protectedFiles.add(normalizeRelPath(file));
    }

    if ((status.includes("R") || status.includes("C")) && entries[i + 1]) {
      protectedFiles.add(normalizeRelPath(entries[++i]));
    }
  }

  return protectedFiles;
};

const writeFileFromBlob = async (root, file, blobHash) => {
  const target = safePath(root, file);
  const content = await getBlob(root, blobHash);

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content);
};

const installDependenciesIfNeeded = async (root, filesList) => {
  const touchedDeps =
    filesList.includes("package.json") || filesList.includes("package-lock.json");

  if (!touchedDeps) {
    return "Dependências: sem alterações.";
  }

  try {
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    await exec(npm, ["install", "--no-audit", "--no-fund"], {
      cwd: root,
      windowsHide: true,
      maxBuffer: 50 * 1024 * 1024,
    });
    return "Dependências instaladas com sucesso.";
  } catch {
    return "Não foi possível instalar as dependências automaticamente. Rode npm install manualmente.";
  }
};

const applyUpdate = async (root, oldRef, newRef) => {
  const oldTree = await getTree(root, oldRef);
  const newTree = await getTree(root, newRef);
  const changedFiles = await getChangedFiles(root, oldRef, newRef);
  const protectedFiles = await getProtectedFiles(root);

  const updated = [];
  const added = [];
  const removed = [];
  const ignored = [];

  for (const file of changedFiles) {
    const target = safePath(root, file);
    const oldFile = oldTree.get(file);
    const newFile = newTree.get(file);

    if (protectedFiles.has(file)) {
      ignored.push(file);
      continue;
    }

    // Se o arquivo não existia no commit antigo mas já existe no disco localmente, protege
    if (!oldFile && newFile) {
      try {
        await fs.lstat(target);
        ignored.push(file);
        continue;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }

    if (newFile) {
      await writeFileFromBlob(root, file, newFile.hash);
      if (oldFile) {
        updated.push(file);
      } else {
        added.push(file);
      }
    } else if (oldFile) {
      await fs.rm(target, { recursive: true, force: true });
      removed.push(file);
    }
  }

  return {
    updated,
    added,
    removed,
    ignored,
  };
};

const formatList = (title, files, numbered = false) => {
  if (!files.length) return "";
  const lines = files.map((file, idx) =>
    numbered ? `${idx + 1}. \`${file}\`` : `• \`${file}\``
  );
  return `\n\n*${title} (${files.length}):*\n${lines.join("\n")}`;
};

const parseSelectionIndexes = (tokens, maxLength) => {
  const joined = tokens.join(" ").trim().toLowerCase();
  if (!joined) return { error: "Informe os números dos arquivos (ex: `1, 2`) ou `todos`." };

  if (joined === "todos" || joined === "all" || joined === "*") {
    return { indexes: Array.from({ length: maxLength }, (_, i) => i) };
  }

  const parts = joined
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const set = new Set();
  for (const part of parts) {
    const num = Number(part);
    if (!Number.isInteger(num) || num < 1 || num > maxLength) {
      return { error: `Número inválido: "${part}". Escolha entre 1 e ${maxLength}.` };
    }
    set.add(num - 1);
  }

  if (!set.size) {
    return { error: "Nenhum número válido selecionado." };
  }

  return { indexes: Array.from(set) };
};

export default {
  name: "update",
  description: "Atualiza o bot preservando alterações locais e permite escolher ignorados.",
  commands: ["update", "atualizar", "atualizacao"],
  usage: `${PREFIX}update | ${PREFIX}update aplicar <números|todos> | ${PREFIX}update cancelar`,

  handle: async ({
    args,
    userLid,
    remoteJid,
    sendWaitReply,
    sendSuccessReply,
    sendErrorReply,
  }) => {
    try {
      if (userLid !== OWNER_LID) {
        throw new WarningError("Apenas o proprietário do bot pode atualizar.");
      }

      const sub = (args[0] || "").toLowerCase();
      const pendingKey = `${remoteJid}:${userLid}`;

      // Limpa seleção expirada
      const existingPending = pendingSelections.get(pendingKey);
      if (existingPending && Date.now() > existingPending.expiresAt) {
        pendingSelections.delete(pendingKey);
      }

      if (sub === "cancelar") {
        if (!pendingSelections.has(pendingKey)) {
          return await sendErrorReply("Não há seleção de arquivos pendente.");
        }
        pendingSelections.delete(pendingKey);
        return await sendSuccessReply("Seleção de arquivos ignorados cancelada.");
      }

      if (sub === "aplicar") {
        const pending = pendingSelections.get(pendingKey);
        if (!pending) {
          return await sendErrorReply(
            `Não há lista de arquivos ignorados pendente. Rode \`${PREFIX}update\` primeiro.`
          );
        }

        const parsed = parseSelectionIndexes(args.slice(1), pending.ignoredFiles.length);
        if (parsed.error) {
          return await sendErrorReply(parsed.error);
        }

        await sendWaitReply("Aplicando os arquivos selecionados...");

        const selectedFiles = parsed.indexes.map((i) => pending.ignoredFiles[i]);
        const keptFiles = pending.ignoredFiles.filter(
          (_, i) => !parsed.indexes.includes(i)
        );
        const newTree = await getTree(pending.root, pending.remoteHead);

        const forcedUpdated = [];
        const forcedRemoved = [];

        for (const file of selectedFiles) {
          const newFile = newTree.get(file);
          if (newFile) {
            await writeFileFromBlob(pending.root, file, newFile.hash);
            forcedUpdated.push(file);
          } else {
            const target = safePath(pending.root, file);
            await fs.rm(target, { recursive: true, force: true });
            forcedRemoved.push(file);
          }
        }

        pendingSelections.delete(pendingKey);

        const depMsg = await installDependenciesIfNeeded(pending.root, [
          ...forcedUpdated,
          ...forcedRemoved,
        ]);

        let reply =
          `✅ *Arquivos selecionados aplicados!*\n\n` +
          `Sobrescritos: ${forcedUpdated.length}\n` +
          `Removidos: ${forcedRemoved.length}\n` +
          `Ainda preservados: ${keptFiles.length}\n\n` +
          `${depMsg}`;

        if (forcedUpdated.length) reply += formatList("Aplicados", forcedUpdated);
        if (forcedRemoved.length) reply += formatList("Removidos", forcedRemoved);
        if (keptFiles.length) reply += formatList("Continuam preservados", keptFiles);

        reply += `\n\nReinicie o bot para carregar as mudanças.`;

        return await sendSuccessReply(reply);
      }

      await sendWaitReply("Verificando atualizações no GitHub...");

      const root = await getRoot();
      const branch = (await git(["branch", "--show-current"], root)).trim();
      if (!branch) {
        throw new Error("Não foi possível identificar a branch atual.");
      }

      await git(["fetch", "--prune", "origin"], root);

      const remote = `origin/${branch}`;
      await git(["rev-parse", "--verify", remote], root);

      const localHead = (await git(["rev-parse", "HEAD"], root)).trim();
      const remoteHead = (await git(["rev-parse", remote], root)).trim();

      if (localHead === remoteHead) {
        return await sendSuccessReply("O bot já está atualizado.");
      }

      const [ahead, behind] = (
        await git(["rev-list", "--left-right", "--count", `HEAD...${remote}`], root)
      )
        .trim()
        .split(/\s+/)
        .map(Number);

      if (ahead > 0) {
        throw new Error(
          "Existem commits locais não enviados ao GitHub. Atualização cancelada."
        );
      }

      if (behind === 0) {
        return await sendSuccessReply("Nenhuma atualização disponível.");
      }

      await sendWaitReply("Aplicando atualizações e preservando arquivos modificados...");

      const report = await applyUpdate(root, localHead, remoteHead);

      await git(
        ["update-ref", `refs/heads/${branch}`, remoteHead, localHead],
        root
      );

      const depMsg = await installDependenciesIfNeeded(root, [
        ...report.updated,
        ...report.added,
        ...report.removed,
      ]);

      let message =
        `✅ *Atualização concluída!*\n\n` +
        `Atualizados: ${report.updated.length}\n` +
        `Adicionados: ${report.added.length}\n` +
        `Removidos: ${report.removed.length}\n` +
        `Ignorados (modificados/locais): ${report.ignored.length}\n\n` +
        `${depMsg}`;

      message += formatList("Novos arquivos", report.added);

      if (report.ignored.length > 0) {
        pendingSelections.set(pendingKey, {
          root,
          remoteHead,
          ignoredFiles: report.ignored,
          expiresAt: Date.now() + SELECTION_TTL_MS,
        });

        message += formatList("Arquivos não atualizados (ignorados)", report.ignored, true);
        message +=
          `\n\nDeseja atualizar algum dos arquivos ignorados acima?\n` +
          `• \`${PREFIX}update aplicar 1, 3\` (escolhe quais atualizar)\n` +
          `• \`${PREFIX}update aplicar todos\` (atualiza todos)\n` +
          `• \`${PREFIX}update cancelar\` (mantém como estão)\n` +
          `*(Expira em 5 minutos)*`;
      } else {
        message += `\n\nReinicie o bot para carregar as atualizações.`;
      }

      await sendSuccessReply(message);
    } catch (error) {
      await sendErrorReply(error.message || "Erro ao atualizar o bot.");
    }
  },
};
