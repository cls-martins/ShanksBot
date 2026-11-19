
/**
 * Atualiza os arquivos do ShanksBot pelo WhatsApp.
 *
 * Requer instalação via git clone e Git disponível no PATH.
 * Não sobrescreve alterações locais nem commits próprios.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { OWNER_LID, PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";

const execFileAsync = promisify(execFile);

async function run(command, args, cwd, timeout = 120000) {
  const { stdout = "", stderr = "" } = await execFileAsync(
    command,
    args,
    {
      cwd,
      timeout,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    },
  );

  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  };
}

async function installDependencies(cwd) {
  if (process.platform === "win32") {
    return run(
      "cmd.exe",
      ["/d", "/s", "/c", "npm install --no-audit --no-fund"],
      cwd,
      300000,
    );
  }

  return run(
    "npm",
    ["install", "--no-audit", "--no-fund"],
    cwd,
    300000,
  );
}

export default {
  name: "update",
  description: "Atualiza o ShanksBot pelo WhatsApp",
  commands: ["update", "atualizar", "atualizacao"],
  usage: `${PREFIX}update`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    userLid,
    sendWaitReply,
    sendSuccessReply,
    sendErrorReply,
  }) => {
    if (!OWNER_LID || userLid !== OWNER_LID) {
      throw new WarningError(
        "Somente o dono do bot pode executar esta atualização.",
      );
    }

    let codeUpdated = false;

    try {
      await sendWaitReply(
        "Verificando atualizações do ShanksBot. Aguarde...",
      );

      const root = await run(
        "git",
        ["rev-parse", "--show-toplevel"],
        process.cwd(),
      );

      const cwd = root.stdout;

      if (!cwd) {
        throw new Error("Pasta do repositório não encontrada.");
      }

      const remote = await run(
        "git",
        ["remote", "get-url", "origin"],
        cwd,
      );

      if (!remote.stdout) {
        throw new Error(
          "Remote origin não configurado. Instale o bot usando git clone.",
        );
      }

      const status = await run(
        "git",
        ["status", "--porcelain", "--untracked-files=no"],
        cwd,
      );

      if (status.stdout) {
        throw new Error(
          "Existem alterações locais em arquivos do projeto. Faça backup ou salve essas alterações antes de atualizar. Nenhum arquivo foi sobrescrito.",
        );
      }

      const branch = (
        await run("git", ["branch", "--show-current"], cwd)
      ).stdout;

      if (!branch) {
        throw new Error("Não foi possível identificar a branch atual.");
      }

      await run("git", ["fetch", "--prune", "origin"], cwd);

      let remoteBranch = `origin/${branch}`;

      try {
        await run(
          "git",
          ["rev-parse", "--verify", remoteBranch],
          cwd,
        );
      } catch {
        let found = false;

        for (const candidate of ["origin/main", "origin/master"]) {
          try {
            await run(
              "git",
              ["rev-parse", "--verify", candidate],
              cwd,
            );

            remoteBranch = candidate;
            found = true;
            break;
          } catch {
            // Tenta a próxima branch.
          }
        }

        if (!found) {
          throw new Error("Nenhuma branch remota compatível foi encontrada.");
        }
      }

      const oldHead = (
        await run("git", ["rev-parse", "HEAD"], cwd)
      ).stdout;

      const comparison = (
        await run(
          "git",
          [
            "rev-list",
            "--left-right",
            "--count",
            `HEAD...${remoteBranch}`,
          ],
          cwd,
        )
      ).stdout.split(/\s+/);

      const ahead = Number(comparison[0]);
      const behind = Number(comparison[1]);

      if (!Number.isFinite(ahead) || !Number.isFinite(behind)) {
        throw new Error("Falha ao comparar as versões.");
      }

      if (ahead > 0) {
        throw new Error(
          "Sua instalação possui commits locais que não existem no GitHub. Atualização cancelada para proteger seu histórico.",
        );
      }

      if (behind === 0) {
        await sendSuccessReply(
          "Seu ShanksBot já está atualizado!",
        );
        return;
      }

      await run(
        "git",
        ["merge", "--ff-only", remoteBranch],
        cwd,
      );

      codeUpdated = true;

      const changedFiles = (
        await run(
          "git",
          [
            "diff",
            "--name-only",
            oldHead,
            "HEAD",
            "--",
            "package.json",
            "package-lock.json",
          ],
          cwd,
        )
      ).stdout;

      if (changedFiles) {
        await installDependencies(cwd);
      }

      const newHead = (
        await run("git", ["rev-parse", "--short", "HEAD"], cwd)
      ).stdout;

      await sendSuccessReply(
        `ShanksBot atualizado com sucesso!\n\nCommit: ${newHead}\n\n${
          changedFiles
            ? "Dependências verificadas e instaladas."
            : "Não houve alterações nas dependências."
        }\n\nReinicie o bot pelo terminal para carregar a nova versão.`,
      );
    } catch (error) {
      const details = String(
        error?.stderr || error?.message || error,
      ).slice(0, 1000);

      await sendErrorReply(
        `${codeUpdated
          ? "O código foi atualizado, mas houve um problema na etapa seguinte."
          : "Não foi possível atualizar o bot."
        }\n\nDetalhes: ${details}`,
      );
    }
  },
};
