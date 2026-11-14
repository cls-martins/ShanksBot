/*
Comando para gerar porcentagem de ship entre dois membros do grupo.

O Bot envia uma mensagem junto com uma foto gerada por python.
*/

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";

export default {
  name: "ship",
  description: "Gera um card de ship profissional de alta qualidade via Python",
  commands: ["ship"],
  usage: `${PREFIX}ship @pessoa1 @pessoa2`,
  handle: async ({
    sendWaitReact,
    sendSuccessReact,
    sendImageFromBuffer,
    args,
    webMessage,
    socket,
  }) => {
    await sendWaitReact();

    try {
      let jid1 = null;
      let jid2 = null;

      const contextInfo = webMessage?.message?.extendedTextMessage?.contextInfo || 
                          webMessage?.message?.imageMessage?.contextInfo || 
                          webMessage?.message?.videoMessage?.contextInfo;

      if (contextInfo && contextInfo.mentionedJid && contextInfo.mentionedJid.length >= 2) {
        jid1 = contextInfo.mentionedJid[0];
        jid2 = contextInfo.mentionedJid[1];
      } else if (args && args.length >= 2) {
        const cleanArgs = args.filter(arg => arg && arg.toLowerCase() !== "e");
        if (cleanArgs.length >= 2) {
          const raw1 = cleanArgs[0].replace("@", "").replace(/[^0-9]/g, "");
          const raw2 = cleanArgs[1].replace("@", "").replace(/[^0-9]/g, "");
          
          if (raw1.length > 5) jid1 = `${raw1}@s.whatsapp.net`;
          if (raw2.length > 5) jid2 = `${raw2}@s.whatsapp.net`;
        }
      }

      if (!jid1 || !jid2) {
        throw new WarningError(`❌ Marque duas pessoas para o ship!\n\nExemplo: \`${PREFIX}ship @fulano @cicrano\``);
      }

      let pfp1Url = "";
      let pfp2Url = "";

      try {
        if (socket && typeof socket.profilePictureUrl === "function") {
          pfp1Url = await socket.profilePictureUrl(jid1, "image").catch(() => "");
          pfp2Url = await socket.profilePictureUrl(jid2, "image").catch(() => "");
        }
      } catch (e) {}

      const porcentagem = Math.floor(Math.random() * 101);

      let mensagemAmor = "";
      if (porcentagem < 30) {
        mensagemAmor = `Até água e óleo têm mais química que vocês 🧊`;
      } else if (porcentagem < 70) {
        mensagemAmor = `Até que conversam, tem potencial para dar certo!`;
      } else {
        mensagemAmor = `Casal perfeito! O santo bateu forte, já podem marcar o casamento! ❤️`;
      }

      const outputPath = path.join(process.cwd(), `temp_ship_${Date.now()}.jpg`);
      const scriptPath = path.join(process.cwd(), "src/utils/ship.py");

      // Executa o script Python para gerar a imagem com alta qualidade gráfica
      await new Promise((resolve, reject) => {
        exec(`python3 "${scriptPath}" "${pfp1Url}" "${pfp2Url}" ${porcentagem} "${outputPath}"`, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      if (!fs.existsSync(outputPath)) {
        throw new Error("A imagem não foi gerada pelo script.");
      }

      const buffer = fs.readFileSync(outputPath);
      fs.unlinkSync(outputPath); // Limpa o arquivo temporário

      const legendaFinal = `${porcentagem}% entre @${jid1.split("@")[0]} e @${jid2.split("@")[0]} . ${mensagemAmor}`;

      await sendImageFromBuffer(buffer, legendaFinal, [jid1, jid2]);
      await sendSuccessReact();
    } catch (error) {
      console.error("Erro ao gerar ship profissional:", error);
      if (error instanceof WarningError) throw error;
      throw new WarningError("❌ Ocorreu um erro ao gerar a imagem do ship.");
    }
  },
};
