/*
Menu de ajuda, altere a lista aqui
*/

import pkg from "../package.json" with { type: "json" };
import { BOT_NAME } from "./config.js";
import { getPrefix } from "./utils/database.js";
import { readMore } from "./utils/index.js";

export function menuMessage(groupJid) {
  const date = new Date();

  const prefix = getPrefix(groupJid);

  return `╭════─「 Menu de Ajuda 」─═══
┃${readMore()}
┠ Prefixo: ${prefix}
┠ Versão: ${pkg.version}
┃
┠ *!info* para ajuda em comandos
┃
┗═════─「⚜️」─══════


╭══─「 Comandos de Ajuda ─═══
┃
┠ ${prefix}bug
┠ ${prefix}info
┠ ${prefix}ping
┠ ${prefix}sobre
┠ ${prefix}feedback
┠ ${prefix}reportar
┠ ${prefix}sugestão
┃
┗════─「⚜️」─═════`;
}
