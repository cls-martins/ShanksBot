/*
Menu de audios aqui. altere a lista
*/

import pkg from "../package.json" with { type: "json" };
import { BOT_NAME } from "./config.js";
import { getPrefix } from "./utils/database.js";
import { readMore } from "./utils/index.js";

export function menuMessage(groupJid) {
  const date = new Date();

  const prefix = getPrefix(groupJid);

  return `╭═════─「 Audios 」─════
┃${readMore()}
┠ Prefixo: ${prefix}
┠ Versão: ${pkg.version}
┃
┠ *!info* para ajuda em comandos
┃
┗═════─「⚜️」─══════


╭═─「 Edições de Audio 」─═
┃
┠ ${prefix}estourar
┠ ${prefix}acelerar
┠ ${prefix}slow
┠ ${prefix}demon
┠ ${prefix}fino
┠ ${prefix}robô
┠ ${prefix}eco
┠ ${prefix}radio
┠ ${prefix}alien
┠ ${prefix}cortar-audio
┃
┗════─「⚜️」─════`;
}
