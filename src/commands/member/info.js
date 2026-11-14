/*
Comando para ver informações de outros comandos
*/

import path from "path";
import { COMMANDS_DIR, PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";
import { readDirectoryRecursive } from "../../utils/index.js";

export default {
  name: "info",
  description: "Exibe as informações de um comando ou a ajuda do sistema",
  commands: ["info", "info-cmd", "info-comando", "info-command"],
  usage: `${PREFIX}info <comando>`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ sendReply, sendWaitReact, sendSuccessReact, args }) => {
    const commandName = args[0]?.toLowerCase().trim();

    // Se usado sem nenhum argumento, mostra o guia explicativo
    if (!commandName) {
      await sendSuccessReact();
      const helpMessage = 
        `🤖 *Central de Informações do Bot*\n\n` +
        `Este comando serve para consultar os detalhes, atalhos e a forma correta de usar qualquer função do bot.\n\n` +
        `📌 *Como usar:*\n` +
        `\`${PREFIX}info <nome-do-comando>\`\n\n` +
        `💡 *Exemplos úteis:*\n` +
        `• \`${PREFIX}info play\`\n` +
        `• \`${PREFIX}info mudar-foto\`\n` +
        `• \`${PREFIX}info yt-video\``;

      return await sendReply(helpMessage);
    }

    await sendWaitReact();

    try {
      const commandFiles = await readDirectoryRecursive(COMMANDS_DIR);
      let cmdFile = null;
      let cmd = null;

      // 1. Tenta encontrar pelo nome exato do arquivo (ex: "sticker" -> sticker.js)
      for (const file of commandFiles) {
        const fileName = path.basename(file, path.extname(file)).toLowerCase();
        if (fileName === commandName) {
          cmdFile = file;
          break;
        }
      }

      // 2. Se não achar pelo arquivo, procura dentro da lista de commands/aliases de cada ficheiro
      if (!cmdFile) {
        for (const file of commandFiles) {
          try {
            const imported = await import(file);
            const cmdData = imported.default || {};
            const aliases = cmdData.commands ? cmdData.commands.map(c => c.toLowerCase()) : [];
            const internalName = cmdData.name ? cmdData.name.toLowerCase() : "";

            if (aliases.includes(commandName) || internalName === commandName) {
              cmdFile = file;
              cmd = imported;
              break;
            }
          } catch (e) {
            // Ignora ficheiros que falhem temporariamente ao importar
          }
        }
      }

      if (!cmdFile) {
        throw new WarningError(`Comando "${commandName}" não foi encontrado.`);
      }

      // Se ainda não tiver importado o comando correto, importa agora
      if (!cmd) {
        cmd = await import(cmdFile);
      }

      const cmdData = cmd.default || {};
      const name = cmdData.name || commandName;
      const description = cmdData.description || "Sem descrição informada.";
      const aliases = cmdData.commands ? cmdData.commands.join(", ") : commandName;
      const usage = cmdData.usage || `${PREFIX}${commandName}`;

      // Layout limpo e organizado
      const infoCard = 
        `ℹ️ *Informações do Comando*\n` +
        `────────────────────\n` +
        `📌 *Nome:* \`${name}\`\n` +
        `📝 *Descrição:* ${description}\n` +
        `⚡ *Outros nomes (Atalhos):* \`${aliases}\`\n` +
        `🛠️ *Como usar:* \`${usage}\`\n` +
        `────────────────────`;

      await sendSuccessReact();
      await sendReply(infoCard);
    } catch (error) {
      if (error instanceof WarningError) {
        throw error;
      }
      throw new WarningError(`Não foi possível carregar as informações do comando.`);
    }
  },
};
