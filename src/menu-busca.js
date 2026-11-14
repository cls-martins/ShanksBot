/*
Menu de busca aqui, altere a lista.
*/

import pkg from "../package.json" with { type: "json" };
import { BOT_NAME } from "./config.js";
import { getPrefix } from "./utils/database.js";
import { readMore } from "./utils/index.js";

export function menuMessage(groupJid) {
  const date = new Date();

  const prefix = getPrefix(groupJid);

  return `╭═════─「 Busca 」─══════
┃${readMore()}
┠ Prefixo: ${prefix}
┠ Versão: ${pkg.version}
┃
┠ *!info* para ajuda em comandos
┃
┗═════─「⚜️」─══════


╭═─「 Comandos de Busca 」─═
┃
┠ ${prefix}cep
┠ ${prefix}pesquisa
┃
┗════─「⚜️」─════`;
}
