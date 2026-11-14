/*
Menu de admin, altere a mensagem aqui.
*/

import pkg from "../package.json" with { type: "json" };
import { BOT_NAME } from "./config.js";
import { getPrefix } from "./utils/database.js";
import { readMore } from "./utils/index.js";

export function menuMessage(groupJid) {
  const date = new Date();

  const prefix = getPrefix(groupJid);

  return `╭═════─「 Admins 」─════╮
┃${readMore()}
┠ Prefixo: ${prefix}
┠ Versão: ${pkg.version}
┃
┠ *!info* para ajuda em comandos
┃
┗═════─「⚜️」─══════


╭══─「 Anti Mensagens 」─══
┃
┠ ${prefix}anti-audio (1/0)
┠ ${prefix}anti-call (1/0)
┠ ${prefix}anti-image (1/0)
┠ ${prefix}anti-video (1/0)
┠ ${prefix}anti-link (1/0)
┠ ${prefix}anti-sticker (1/0)
┠ ${prefix}anti-lottie-sticker (1/0)
┠ ${prefix}anti-payment (1/0)
┠ ${prefix}anti-document (1/0)
┠ ${prefix}anti-event (1/0)
┠ ${prefix}anti-product (1/0)
┠ ${prefix}anti-status-grupo (1/0)
┃
┠─Essas mensagens bloqueiam a ação
┃ selecionada e dá ban na hora em
┃ membros que enviarem/faça algo.
┃
┗════─「⚜️」─══════


╭══─「 Funções Rápidas 」─══
┃
┠ ${prefix}ban
┠ ${prefix}mudar-nome
┠ ${prefix}delete-msg
┠ ${prefix}marcar-todos
┠ ${prefix}link-grupo
┠ ${prefix}promover
┠ ${prefix}rebaixar
┠ ${prefix}abrir-grupo
┠ ${prefix}fechar-grupo
┠ ${prefix}only-admin (1/0)
┃
┗═════─「⚜️」─═════


╭══─「 Funções do Bot 」─══
┃
┠ ${prefix}mute
┠ ${prefix}desmutar
┠ ${prefix}warn
┠ ${prefix}warn-lista
┠ ${prefix}unwarn
┠ ${prefix}revelar
┠ ${prefix}limpar-chat
┠ ${prefix}block-wpp
┠ ${prefix}welcome (1/0)
┠ ${prefix}exit (1/0)
┃
┗═════─「⚜️」─═════`;
}
