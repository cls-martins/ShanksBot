import pkg from "../package.json" with { type: "json" };
import { BOT_NAME } from "./config.js";
import { getPrefix } from "./utils/database.js";
import { readMore } from "./utils/index.js";

export function menuMessage(groupJid) {
  const date = new Date();

  const prefix = getPrefix(groupJid);

  return `╭─═─「 Menu de Brincadeiras 」─═╮
┃${readMore()}
┠ Prefixo: ${prefix}
┠ Versão: ${pkg.version}
┃
┠ *!info* para ajuda em comandos
┃
┗═════─「⚜️」─══════


╭══─「 Brincadeiras 」─══
┃
┠ ${prefix}fakechat
┠ ${prefix}perfil
┠ ${prefix}ship
┠ ${prefix}casar
┠ ${prefix}casais
┠ ${prefix}não-casar
┠ ${prefix}divorciar
┠ ${prefix}trisal
┠ ${prefix}fofoca
┠ ${prefix}beijar
┠ ${prefix}abraçar
┠ ${prefix}jantar
┠ ${prefix}lutar
┠ ${prefix}matar
┠ ${prefix}socar
┃
┗═══─「⚜️」─═══


╭══─「 Jogos 」─══
┃
┠ ${prefix}dado
┠ ${prefix}ppt
┃
┗═══─「⚜️」─═══


╭══─「 Ranking 」─══
┃
┠ ${prefix}rank-legal
┠ ${prefix}rank-triste
┠ ${prefix}rank-feliz
┠ ${prefix}rank-beleza
┠ ${prefix}rank-feio
┠ ${prefix}rank-rico
┠ ${prefix}rank-pobre
┠ ${prefix}rank-chato
┠ ${prefix}rank-corno
┠ ${prefix}rank-gostoso
┠ ${prefix}rank-inteligente
┠ ${prefix}rank-dorminhoco
┃
┗═══─「⚜️」─═══`;
}
