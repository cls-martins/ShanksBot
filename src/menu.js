/*
Menu principal
*/

import pkg from "../package.json" with { type: "json" };
import { BOT_NAME } from "./config.js";
import { getPrefix } from "./utils/database.js";
import { readMore } from "./utils/index.js";

export function menuMessage(groupJid) {
  const date = new Date();

  const prefix = getPrefix(groupJid);

  return `╭─「 Me chamo ShanksBot! 」─╮
┃${readMore()}
┠ Prefixo: ${prefix}
┠ Versão: ${pkg.version}
┃
┠ *!info* para ajuda em comandos
┠ *!regras* para regras do grupo
┃
┗═════─「⚜️」─══════


╭══─「 Menus 」─══
┃
┠ ${prefix}admins
┠ ${prefix}busca
┠ ${prefix}audios
┠ ${prefix}downloads
┠ ${prefix}brincadeiras
┠ ${prefix}configurações
┠ ${prefix}ajuda
┃
┗═══─「⚜️」─═══


╭══─「 Principal 」─══
┃
┠ ${prefix}frase
┠ ${prefix}conselho
┠ ${prefix}falar
┃
┗═══─「⚜️」─═══


╭══─「 Parcerias 」─══
┃
┠ ${prefix}newgen
┠ ${prefix}biocard
┠ ${prefix}cinema
┃
┗═══─「⚜️」─═══`;
}
