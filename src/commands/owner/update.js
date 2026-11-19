
/**
 * Atualiza os arquivos do ShanksBot pelo WhatsApp.
 *
 * Requer instalação via git clone e Git disponível no PATH.
 * Não sobrescreve alterações locais nem commits próprios.
 */


import path from "node:path";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { OWNER_LID, PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";

const exec = promisify(execFile);

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
  const output = await git(
    ["ls-tree", "-r", "-z", ref],
    root
  );

  const files = new Map();

  for (const entry of output.split("\0").filter(Boolean)) {
    const tab = entry.indexOf("\t");
    if (tab < 0) continue;

    const [mode, type, hash] = entry
      .slice(0, tab)
      .split(" ");

    const file = entry.slice(tab + 1);

    if (type === "blob") {
      files.set(file, { mode, hash });
    }
  }

  return files;
};

const getBlob = async (root, hash) => {
  const { stdout } = await exec(
    "git",
    ["cat-file", "blob", hash],
    {
      cwd: root,
      encoding: "buffer",
      maxBuffer: 50 * 1024 * 1024,
      windowsHide: true,
    }
  );

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

  return output.split("\0").filter(Boolean);
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

    protectedFiles.add(file);

    // Renames podem trazer dois caminhos.
    if (status.includes("R") || status.includes("C")) {
      if (entries[i + 1]) {
        protectedFiles.add(entries[++i]);
      }
    }
  }

  return protectedFiles;
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

  let dependenciesChanged = false;

  for (const file of changedFiles) {
    const target = safePath(root, file);

    if (protectedFiles.has(file)) {
      ignored.push(file);
      continue;
    }

    const oldFile = oldTree.get(file);
    const newFile = newTree.get(file);

    try {
      await fs.lstat(target);

      if (!oldFile && !newFile) {
        ignored.push(file);
        continue;
      }

      if (!oldFile && newFile) {
        ignored.push(file);
        continue;
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    if (newFile) {
      await fs.mkdir(path.dirname(target), { recursive: true });

      const content = await getBlob(root, newFile.hash);

      if (newFile.mode === "120000") {
        await fs.rm(target, { force: true });
        await fs.symlink(content.toString(), target);
      } else {
        await fs.writeFile(target, content);

        if (newFile.mode === "100755") {
          await fs.chmod(target, 0o755);
        }
      }

      if (oldFile) {
        updated.push(file);
      } else {
        added.push(file);
      }

      if (
        file === "package.json" ||
        file === "package-lock.json"
      ) {
        dependenciesChanged = true;
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
    dependenciesChanged,
  };
};

export default {
  name: "update",
  description: "Atualiza o bot preservando arquivos modificados.",
  commands: ["update", "atualizar", "atualizacao"],
  usage: `${PREFIX}update`,

  handle: async ({
    userLid,
    sendWaitReply,
    sendSuccessReply,
    sendErrorReply,
  }) => {
    try {
      if (userLid !== OWNER_LID) {
        throw new WarningError(
          "Apenas o proprietário do bot pode atualizar."
        );
      }

      await sendWaitReply("Verificando atualizações no GitHub...");

      const root = await getRoot();

      const branch = (
        await git(["branch", "--show-current"], root)
      ).trim();

      if (!branch) {
        throw new Error("Não foi possível identificar a branch atual.");
      }

      await git(["fetch", "--prune", "origin"], root);

      const remote = `origin/${branch}`;

      await git(["rev-parse", "--verify", remote], root);

      const localHead = (
        await git(["rev-parse", "HEAD"], root)
      ).trim();

      const remoteHead = (
        await git(["rev-parse", remote], root)
      ).trim();

      if (localHead === remoteHead) {
        return sendSuccessReply("O bot já está atualizado.");
      }

      const counts = (
        await git(
          ["rev-list", "--left-right", "--count", `HEAD...${remote}`],
          root
        )
      ).trim().split(/\s+/).map(Number);

      const [ahead, behind] = counts;

      if (ahead > 0) {
        throw new Error(
          "Existem commits locais não enviados ao GitHub. Atualização cancelada."
        );
      }

      if (behind === 0) {
        return sendSuccessReply("Nenhuma atualização disponível.");
      }

      await sendWaitReply(
        "Aplicando atualizações e preservando arquivos modificados..."
      );

      const report = await applyUpdate(
        root,
        localHead,
        remoteHead
      );

      // Atualiza a referência da branch sem sobrescrever arquivos locais.
      await git(
        ["update-ref", `refs/heads/${branch}`, remoteHead, localHead],
        root
      );

      let dependencyMessage = "Dependências: sem alterações.";

      if (report.dependenciesChanged) {
        if (
          report.ignored.includes("package.json") ||
          report.ignored.includes("package-lock.json")
        ) {
          dependencyMessage =
            "Arquivos de dependências preservados. Verifique a instalação manualmente.";
        } else {
          try {
            const npm = process.platform === "win32"
              ? "npm.cmd"
              : "npm";

            await exec(npm, ["install", "--no-audit", "--no-fund"], {
              cwd: root,
              windowsHide: true,
              maxBuffer: 50 * 1024 * 1024,
            });

            dependencyMessage = "Dependências instaladas com sucesso.";
          } catch {
            dependencyMessage =
              "Não foi possível instalar as dependências automaticamente.";
          }
        }
      }

      const list = (title, files) => {
        if (!files.length) return "";

        return `\n\n${title} (${files.length}):\n` +
          files.slice(0, 15).map((file) => `• ${file}`).join("\n") +
          (files.length > 15 ? "\n• E outros arquivos..." : "");
      };

      const message =
        `Atualização concluída.\n\n` +
        `Atualizados: ${report.updated.length}\n` +
        `Adicionados: ${report.added.length}\n` +
        `Removidos: ${report.removed.length}\n` +
        `Ignorados: ${report.ignored.length}\n\n` +
        dependencyMessage +
        list("Ignorados", report.ignored) +
        list("Novos arquivos", report.added);

      await sendSuccessReply(message);

      await sendWaitReply(
        "Reinicie o bot para carregar as atualizações."
      );
    } catch (error) {
      await sendErrorReply(
        error.message || "Erro ao atualizar o bot."
      );
    }
  },
};

          
