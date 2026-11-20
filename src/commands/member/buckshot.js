/**
 * Buckshot Roulette multiplayer para grupos (até 10 jogadores).
 */

import { PREFIX } from "../../config.js";
import { WarningError, InvalidParameterError } from "../../errors/index.js";

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 2;
const MAX_ITEMS = 4;
const INITIAL_HP = 3;
const MAX_HP = 4;

// Caracteres invisíveis que ativam o botão "Ler mais" no WhatsApp
const READ_MORE = "\u200B".repeat(4000);

const ITEMS = [
  { key: "lupa", label: "🔍 Lupa", aliases: ["lupa", "magnifying", "glass"] },
  { key: "serra", label: "🪚 Serra", aliases: ["serra", "saw", "hand-saw"] },
  { key: "cigarro", label: "🚬 Cigarro", aliases: ["cigarro", "cigar", "smoke"] },
  { key: "cerveja", label: "🍺 Cerveja", aliases: ["cerveja", "beer"] },
  {
    key: "inversor",
    label: "🔌 Inversor",
    aliases: ["inversor", "inverter", "invert"],
  },
  {
    key: "algema",
    label: "⛓️ Algema",
    aliases: ["algema", "algemas", "handcuffs", "cuff"],
  },
  {
    key: "adrenalina",
    label: "💉 Adrenalina",
    aliases: ["adrenalina", "adrenaline", "roubar", "steal"],
  },
];

// Salas ativas por grupo (remoteJid -> sala)
const rooms = new Map();

function extractDigits(value) {
  const beforeAt = String(value || "").split("@")[0].split(":")[0];
  return beforeAt.replace(/\D/g, "");
}

function normalizeJid(jid) {
  if (!jid || typeof jid !== "string") return "";
  if (jid.includes(":")) {
    const [left, right] = jid.split("@");
    const cleanLeft = left.split(":")[0];
    return right ? `${cleanLeft}@${right}` : cleanLeft;
  }
  return jid.trim();
}

function extractPushName(props) {
  const candidates = [
    props.pushName,
    props.senderName,
    props.userName,
    props.webMessage?.pushName,
    props.msg?.pushName,
    props.info?.pushName,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      return c.trim();
    }
  }
  return "";
}

function resolveDisplayLabel(jid, players = []) {
  const norm = normalizeJid(jid);
  const digits = extractDigits(norm);

  const found = players.find((p) => {
    if (!p?.jid) return false;
    if (normalizeJid(p.jid) === norm) return true;
    const pDigits = extractDigits(p.jid);
    return Boolean(digits && pDigits && digits === pDigits);
  });

  if (found?.name) {
    return `@${found.name}`;
  }

  // Se for um LID gigante (ex: 30658164457495), evita exibir um número enorme sem sentido quando não há nome
  const baseId = digits || norm.split("@")[0].split(":")[0];
  return `@${baseId}`;
}

function formatTag(jidOrPlayer, players = []) {
  if (jidOrPlayer && typeof jidOrPlayer === "object") {
    if (jidOrPlayer.name) return `@${jidOrPlayer.name}`;
    return resolveDisplayLabel(jidOrPlayer.jid, players);
  }
  return resolveDisplayLabel(jidOrPlayer, players);
}

function buildHelpMessage() {
  return (
    `📖 *BUCKSHOT ROULETTE* 🎲\n` +
    `${READ_MORE}\n\n` +
    `🎯 *Objetivo:* Zerar a vida (HP) dos seus rivais atirando com a espingarda! (Até ${MAX_PLAYERS} jogadores)\n\n` +
    `🔫 *Como funciona a arma:*\n` +
    `- A cada rodada, entram cartuchos *🔴 Reais* (causam dano) e *🔵 Vazios* (sem dano) misturados.\n` +
    `- *Atirar no rival:* Se for real, ele perde 1 HP. O turno passa.\n` +
    `- *Atirar em si mesmo:* Se for vazio, você ganha o bônus e *joga de novo*! Se for real, você toma o dano e o turno passa.\n\n` +
    `🎒 *Os Poderes (Itens):*\n` +
    `- *Como receber:* No início de *cada nova rodada*, cada jogador ganha *1 poder aleatório* (limite de até ${MAX_ITEMS} itens na mochila).\n` +
    `- 🔍 *Lupa:* Mostra se a bala atual é real ou vazia.\n` +
    `- 🪚 *Serra:* Dobra o dano do próximo tiro (vira 2 de dano).\n` +
    `- 🚬 *Cigarro:* Recupera 1 de vida.\n` +
    `- 🍺 *Cerveja:* Descarta/joga fora a bala atual da câmara.\n` +
    `- 🔌 *Inversor:* Troca o cartucho atual (vazio vira real e vice-versa).\n` +
    `- ⛓️ *Algema:* Algema um rival para pular o próximo turno dele.\n` +
    `- 💉 *Adrenalina:* Rouba 1 item da mochila de um rival para a sua.\n\n` +
    `⚙️ *Comandos do Jogo:*\n` +
    `- \`${PREFIX}buckshot criar\` - Cria a mesa de jogo\n` +
    `- \`${PREFIX}buckshot entrar\` - Entra na mesa\n` +
    `- \`${PREFIX}buckshot iniciar\` - Começa a partida\n` +
    `- \`${PREFIX}buckshot self\` - Atira em si mesmo\n` +
    `- \`${PREFIX}buckshot @fulano\` - Atira em um rival\n` +
    `- \`${PREFIX}buckshot usar [item] [@fulano]\` (ou \`${PREFIX}buckshot [item] [@fulano]\`) - Usa um poder\n` +
    `- \`${PREFIX}buckshot fechar\` - Encerra e limpa qualquer sala/partida aberta`
  );
}

function collectRawMentions(props) {
  const set = new Set();

  for (const single of [
    props.targetUserLid,
    props.targetUserJid,
    props.replyUserLid,
  ]) {
    const norm = normalizeJid(single);
    if (norm) set.add(norm);
  }

  for (const arr of [props.mentions, props.mentionedJid]) {
    if (Array.isArray(arr)) {
      for (const j of arr) {
        const norm = normalizeJid(j);
        if (norm) set.add(norm);
      }
    }
  }

  const msg = props.webMessage?.message;
  const ctxMentions =
    msg?.extendedTextMessage?.contextInfo?.mentionedJid ||
    msg?.imageMessage?.contextInfo?.mentionedJid ||
    msg?.videoMessage?.contextInfo?.mentionedJid ||
    [];

  if (Array.isArray(ctxMentions)) {
    for (const j of ctxMentions) {
      const norm = normalizeJid(j);
      if (norm) set.add(norm);
    }
  }

  const quotedParticipant = msg?.extendedTextMessage?.contextInfo?.participant;
  if (quotedParticipant) {
    set.add(normalizeJid(quotedParticipant));
  }

  return Array.from(set);
}

function resolveTargetPlayer(candidates, rawMentions = [], args = []) {
  const rawList = [
    ...rawMentions,
    ...(Array.isArray(args) ? args : [])
      .map((v) => normalizeJid(v))
      .filter(Boolean),
  ];

  for (const raw of rawList) {
    const exact = candidates.find((p) => normalizeJid(p.jid) === raw);
    if (exact) return exact;

    const rawDigits = extractDigits(raw);
    if (rawDigits) {
      const byDigits = candidates.find(
        (p) => extractDigits(p.jid) === rawDigits
      );
      if (byDigits) return byDigits;
    }
  }

  const query = (Array.isArray(args) ? args.join(" ") : "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();

  if (query) {
    const byName = candidates.find(
      (p) => p.name && p.name.toLowerCase().includes(query)
    );
    if (byName) return byName;
  }

  if (candidates.length === 1 && query.length > 0) {
    return candidates[0];
  }

  return null;
}

function hasTargetInput(rawMentions = [], args = []) {
  if (rawMentions.some(Boolean)) return true;
  return (Array.isArray(args) ? args : []).some(
    (a) => String(a || "").trim().length > 0
  );
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomItemKey() {
  const idx = Math.floor(Math.random() * ITEMS.length);
  return ITEMS[idx].key;
}

function findItemByInput(input) {
  if (!input) return null;
  const clean = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  for (const item of ITEMS) {
    const normKey = item.key
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (clean === normKey || item.aliases.includes(clean)) {
      return item;
    }
  }
  return null;
}

function getAlivePlayers(room) {
  return room.players.filter((p) => p.hp > 0);
}

function getCurrentPlayer(room) {
  const alive = getAlivePlayers(room);
  if (!alive.length) return null;
  return alive[room.turnIndex % alive.length];
}

function advanceTurn(room, currentJid) {
  const alive = getAlivePlayers(room);
  if (alive.length <= 1) return { skipped: [] };

  const currentNorm = normalizeJid(currentJid);
  const currentPos = alive.findIndex(
    (p) => normalizeJid(p.jid) === currentNorm
  );
  let nextPos =
    currentPos === -1
      ? room.turnIndex % alive.length
      : (currentPos + 1) % alive.length;

  const skipped = [];
  let guard = 0;

  while (alive[nextPos]?.cuffed && alive.length > 1 && guard < alive.length) {
    alive[nextPos].cuffed = false;
    skipped.push(alive[nextPos].jid);
    nextPos = (nextPos + 1) % alive.length;
    guard += 1;
  }

  room.turnIndex = nextPos;
  return { skipped };
}

function generateShells(playerCount) {
  const total = Math.min(10, Math.max(4, playerCount + 2));
  const liveCount = Math.max(1, Math.floor(total / 2));
  const blankCount = total - liveCount;

  const shells = [];
  for (let i = 0; i < liveCount; i++) shells.push("live");
  for (let i = 0; i < blankCount; i++) shells.push("blank");

  return {
    shells: shuffle(shells),
    liveCount,
    blankCount,
  };
}

function startNewRound(room) {
  const alive = getAlivePlayers(room);
  room.round += 1;

  const { shells, liveCount, blankCount } = generateShells(alive.length);
  room.shells = shells;

  const grantedLog = [];

  for (const player of alive) {
    player.sawActive = false;
    if (player.items.length < MAX_ITEMS) {
      const itemKey = randomItemKey();
      player.items.push(itemKey);
      const meta = ITEMS.find((i) => i.key === itemKey);
      grantedLog.push(
        `${formatTag(player, room.players)} ganhou *${meta.label}*`
      );
    } else {
      grantedLog.push(
        `${formatTag(player, room.players)} (mochila cheia: ${MAX_ITEMS}/${MAX_ITEMS})`
      );
    }
  }

  room.turnIndex = room.turnIndex % alive.length;

  return {
    liveCount,
    blankCount,
    grantedLog,
  };
}

function formatPlayerStatus(player, allPlayers) {
  const hearts = "❤️".repeat(Math.max(0, player.hp)) || "💀";
  const itemsText = player.items.length
    ? player.items
        .map((k) => ITEMS.find((i) => i.key === k)?.label || k)
        .join(", ")
    : "_vazia_";
  const sawTag = player.sawActive ? " | 🪚 *SERRA ATIVA (2 DMG)*" : "";
  const cuffTag = player.cuffed ? " | ⛓️ *ALGEMADO*" : "";
  return `• ${formatTag(player, allPlayers)} — ${hearts} (${player.hp}/${MAX_HP} HP)${sawTag}${cuffTag}\n  🎒 Itens: ${itemsText}`;
}

function formatBoard(room, skippedJids = []) {
  const alive = getAlivePlayers(room);
  const current = getCurrentPlayer(room);

  const lines = alive.map((p) => {
    const pointer =
      current && normalizeJid(p.jid) === normalizeJid(current.jid) ? "👉 " : "";
    return `${pointer}${formatPlayerStatus(p, room.players)}`;
  });

  const skippedText = skippedJids.length
    ? `⛓️ *Turno pulado por algema:* ${skippedJids
        .map((j) => formatTag(j, room.players))
        .join(", ")}\n`
    : "";

  return (
    `🎲 *BUCKSHOT ROULETTE — RODADA ${room.round}* 🎲\n` +
    `🔫 Câmara: *${room.shells.length}* cartucho(s) restante(s)\n\n` +
    `${lines.join("\n\n")}\n\n` +
    skippedText +
    (current ? `🎯 *Vez de:* ${formatTag(current, room.players)}` : "")
  );
}

function collectMentions(room, extraJids = []) {
  const set = new Set();
  for (const p of room.players) {
    if (p.jid) set.add(p.jid);
  }
  for (const j of extraJids) {
    if (j) set.add(j);
  }
  return Array.from(set);
}

export default {
  name: "buckshot",
  description: "Joga Buckshot Roulette multiplayer no grupo (até 10 jogadores).",
  commands: ["buckshot", "roleta-russa", "roleta"],
  usage: `${PREFIX}buckshot <criar|entrar|iniciar|self|@alvo|usar [item]|fechar>`,

  handle: async (props) => {
    const {
      args = [],
      remoteJid,
      userLid,
      sendReply,
      sendSuccessReply,
      sendErrorReply,
    } = props;

    try {
      const sub = (args[0] || "").toLowerCase();
      const rawMentions = collectRawMentions(props);
      const actorName = extractPushName(props);

      if (!sub || sub === "ajuda" || sub === "help" || sub === "regras") {
        return await sendReply(buildHelpMessage());
      }

      if (!remoteJid || !remoteJid.endsWith("@g.us")) {
        throw new WarningError("Este comando só funciona dentro de grupos.");
      }

      const actorJid = normalizeJid(userLid);
      const actorDigits = extractDigits(actorJid);
      if (!actorJid) {
        throw new Error("Não foi possível identificar seu usuário.");
      }

      const isSamePlayer = (player) => {
        if (!player?.jid) return false;
        if (normalizeJid(player.jid) === actorJid) return true;
        const pDigits = extractDigits(player.jid);
        return Boolean(actorDigits && pDigits && actorDigits === pDigits);
      };

      // 1. FECHAR SALA
      if (sub === "fechar" || sub === "encerrar" || sub === "sair-sala") {
        if (!rooms.has(remoteJid)) {
          throw new WarningError(
            "Não há nenhuma mesa de Buckshot Roulette aberta neste grupo."
          );
        }
        rooms.delete(remoteJid);
        return await sendSuccessReply(
          "🛑 Mesa de *Buckshot Roulette* encerrada e limpa."
        );
      }

      // 2. CRIAR MESA
      if (sub === "criar") {
        if (rooms.has(remoteJid)) {
          throw new WarningError(
            `Já existe uma mesa aberta neste grupo. Use \`${PREFIX}buckshot entrar\` ou \`${PREFIX}buckshot fechar\`.`
          );
        }

        const hostPlayer = {
          jid: actorJid,
          name: actorName,
          hp: INITIAL_HP,
          items: [],
          sawActive: false,
          cuffed: false,
        };

        rooms.set(remoteJid, {
          hostJid: actorJid,
          started: false,
          round: 0,
          shells: [],
          turnIndex: 0,
          players: [hostPlayer],
        });

        return await sendSuccessReply(
          `🔫 *MESA DE BUCKSHOT ROULETTE CRIADA!*\n` +
            `Criador: ${formatTag(hostPlayer)} (1/${MAX_PLAYERS})\n\n` +
            `• Digite \`${PREFIX}buckshot entrar\` para participar (até ${MAX_PLAYERS} jogadores).\n` +
            `• Digite \`${PREFIX}buckshot iniciar\` quando estiverem prontos (mínimo ${MIN_PLAYERS}).`,
          [actorJid]
        );
      }

      const room = rooms.get(remoteJid);
      if (!room) {
        throw new WarningError(
          `Nenhuma mesa aberta neste grupo. Crie uma com \`${PREFIX}buckshot criar\`.`
        );
      }

      // Atualiza nome caso já esteja na sala e o pushName venha preenchido
      const existingSelf = room.players.find(isSamePlayer);
      if (existingSelf && actorName && !existingSelf.name) {
        existingSelf.name = actorName;
      }

      // 3. ENTRAR NA MESA
      if (sub === "entrar" || sub === "join") {
        if (room.started) {
          throw new WarningError(
            "A partida já começou! Espere terminar ou feche a mesa."
          );
        }
        if (room.players.some(isSamePlayer)) {
          throw new WarningError("Você já está na mesa!");
        }
        if (room.players.length >= MAX_PLAYERS) {
          throw new WarningError(
            `A mesa já atingiu o limite máximo de ${MAX_PLAYERS} jogadores.`
          );
        }

        const newPlayer = {
          jid: actorJid,
          name: actorName,
          hp: INITIAL_HP,
          items: [],
          sawActive: false,
          cuffed: false,
        };

        room.players.push(newPlayer);

        return await sendSuccessReply(
          `${formatTag(newPlayer, room.players)} entrou na mesa! (${room.players.length}/${MAX_PLAYERS} jogadores)`,
          collectMentions(room, [actorJid])
        );
      }

      // 4. INICIAR PARTIDA
      if (sub === "iniciar" || sub === "start") {
        if (room.started) {
          throw new WarningError("A partida já está em andamento!");
        }
        if (room.players.length < MIN_PLAYERS) {
          throw new WarningError(
            `São necessários pelo menos ${MIN_PLAYERS} jogadores para iniciar (atualmente: ${room.players.length}).`
          );
        }

        room.started = true;
        room.turnIndex = 0;
        const roundInfo = startNewRound(room);

        const intro =
          `🔥 *A PARTIDA COMEÇOU!* (${room.players.length} jogadores)\n` +
          `🔴 Reais: *${roundInfo.liveCount}* | 🔵 Vazios: *${roundInfo.blankCount}*\n\n` +
          `🎒 *Itens da rodada:*\n${roundInfo.grantedLog.join("\n")}\n\n` +
          `${formatBoard(room)}`;

        return await sendSuccessReply(intro, collectMentions(room));
      }

      if (!room.started) {
        throw new WarningError(
          `A partida ainda não começou. Use \`${PREFIX}buckshot entrar\` ou \`${PREFIX}buckshot iniciar\`.`
        );
      }

      const currentPlayer = getCurrentPlayer(room);
      if (!currentPlayer || !isSamePlayer(currentPlayer)) {
        throw new WarningError(
          `Ainda não é sua vez de jogar! Aguarde.`,
          currentPlayer ? [currentPlayer.jid] : []
        );
      }

      const activeActorJid = currentPlayer.jid;

      const checkRoundOrWinner = async (extraMessage = "", skippedJids = []) => {
        const alive = getAlivePlayers(room);

        if (alive.length === 1) {
          const winner = alive[0];
          rooms.delete(remoteJid);
          const winText =
            (extraMessage ? `${extraMessage}\n\n` : "") +
            `🏆 *FIM DE JOGO!*\n` +
            `👑 Vencedor: ${formatTag(winner, room.players)} com *${winner.hp} HP*!`;
          await sendSuccessReply(winText, [winner.jid]);
          return true;
        }

        if (alive.length === 0) {
          rooms.delete(remoteJid);
          const drawText =
            (extraMessage ? `${extraMessage}\n\n` : "") +
            `💀 *TODOS CAÍRAM!* Ninguém sobreviveu.`;
          await sendSuccessReply(drawText);
          return true;
        }

        if (room.shells.length === 0) {
          const nextRound = startNewRound(room);
          const roundMsg =
            (extraMessage ? `${extraMessage}\n\n` : "") +
            `🔄 *Câmara vazia! Nova rodada (${room.round}) começando...*\n` +
            `🔴 Reais: *${nextRound.liveCount}* | 🔵 Vazios: *${nextRound.blankCount}*\n\n` +
            `🎒 *Novos poderes recebidos:*\n${nextRound.grantedLog.join("\n")}\n\n` +
            `${formatBoard(room, skippedJids)}`;
          await sendSuccessReply(roundMsg, collectMentions(room));
          return true;
        }

        return false;
      };

      // 5. USAR ITEM
      const maybeItem =
        sub === "usar" || sub === "use"
          ? findItemByInput(args[1])
          : findItemByInput(sub);

      if (sub === "usar" || sub === "use" || maybeItem) {
        if (!maybeItem) {
          throw new InvalidParameterError(
            `Item inválido. Itens disponíveis: 🔍 lupa, 🪚 serra, 🚬 cigarro, 🍺 cerveja, 🔌 inversor, ⛓️ algema, 💉 adrenalina.`
          );
        }

        const itemIdx = currentPlayer.items.indexOf(maybeItem.key);
        if (itemIdx === -1) {
          throw new WarningError(`Você não tem *${maybeItem.label}* na mochila!`);
        }

        const alivePlayers = getAlivePlayers(room);
        const rivals = alivePlayers.filter((p) => !isSamePlayer(p));
        const itemArgs =
          sub === "usar" || sub === "use" ? args.slice(2) : args.slice(1);
        const explicitTarget = hasTargetInput(rawMentions, itemArgs);
        const matchedRival = resolveTargetPlayer(rivals, rawMentions, itemArgs);

        if (maybeItem.key === "algema") {
          if (!rivals.length) {
            throw new WarningError("Não há rivais vivos para algemar.");
          }
          let cuffTarget = rivals[0];
          if (explicitTarget) {
            if (!matchedRival) {
              throw new WarningError(
                "O alvo marcado não é um rival vivo na partida."
              );
            }
            cuffTarget = matchedRival;
          }
          if (cuffTarget.cuffed) {
            throw new WarningError(
              `${formatTag(cuffTarget, room.players)} já está algemado!`
            );
          }

          currentPlayer.items.splice(itemIdx, 1);
          cuffTarget.cuffed = true;

          await sendSuccessReply(
            `⛓️ ${formatTag(currentPlayer, room.players)} algemou ${formatTag(cuffTarget, room.players)}! O próximo turno dele será pulado.`,
            [activeActorJid, cuffTarget.jid]
          );
          return;
        }

        if (maybeItem.key === "adrenalina") {
          if (currentPlayer.items.length - 1 >= MAX_ITEMS) {
            throw new WarningError(
              `Sua mochila já está cheia (${MAX_ITEMS}/${MAX_ITEMS} itens).`
            );
          }

          let stealTarget = null;
          if (explicitTarget) {
            stealTarget = matchedRival;
            if (!stealTarget) {
              throw new WarningError(
                "O alvo marcado não é um rival vivo na partida."
              );
            }
            if (!stealTarget.items.length) {
              throw new WarningError(
                `${formatTag(stealTarget, room.players)} não tem nenhum item para roubar!`
              );
            }
          } else {
            stealTarget = rivals.find((p) => p.items.length > 0);
            if (!stealTarget) {
              throw new WarningError(
                "Nenhum rival tem itens na mochila para roubar."
              );
            }
          }

          currentPlayer.items.splice(itemIdx, 1);
          const stolenIdx = Math.floor(Math.random() * stealTarget.items.length);
          const [stolenKey] = stealTarget.items.splice(stolenIdx, 1);
          currentPlayer.items.push(stolenKey);

          const stolenMeta = ITEMS.find((i) => i.key === stolenKey);
          await sendSuccessReply(
            `💉 ${formatTag(currentPlayer, room.players)} aplicou *Adrenalina* e roubou *${stolenMeta?.label || stolenKey}* de ${formatTag(stealTarget, room.players)}!`,
            [activeActorJid, stealTarget.jid]
          );
          return;
        }

        currentPlayer.items.splice(itemIdx, 1);

        if (maybeItem.key === "lupa") {
          const shell = room.shells[0];
          const shellLabel =
            shell === "live" ? "🔴 *REAL* (causa dano)" : "🔵 *VAZIO* (sem dano)";
          await sendReply(
            `🔍 ${formatTag(currentPlayer, room.players)} olhou pela *Lupa*...\nO cartucho atual na câmara é ${shellLabel}!`,
            [activeActorJid]
          );
          return;
        }

        if (maybeItem.key === "serra") {
          currentPlayer.sawActive = true;
          await sendSuccessReply(
            `🪚 ${formatTag(currentPlayer, room.players)} pegou a *Serra*! O próximo tiro que acertar causará *2 de dano*.`,
            [activeActorJid]
          );
          return;
        }

        if (maybeItem.key === "cigarro") {
          const beforeHp = currentPlayer.hp;
          currentPlayer.hp = Math.min(MAX_HP, currentPlayer.hp + 1);
          const healed = currentPlayer.hp - beforeHp;
          await sendSuccessReply(
            `🚬 ${formatTag(currentPlayer, room.players)} fumou um *Cigarro* e recuperou *+${healed} HP* (${currentPlayer.hp}/${MAX_HP} HP).`,
            [activeActorJid]
          );
          return;
        }

        if (maybeItem.key === "cerveja") {
          const ejected = room.shells.shift();
          const ejectedLabel =
            ejected === "live" ? "🔴 *REAL*" : "🔵 *VAZIO*";
          const msg = `🍺 ${formatTag(currentPlayer, room.players)} abriu uma *Cerveja* e ejetou o cartucho: era ${ejectedLabel}!`;
          const handledEndOrRound = await checkRoundOrWinner(msg);
          if (!handledEndOrRound) {
            await sendSuccessReply(msg, collectMentions(room));
          }
          return;
        }

        if (maybeItem.key === "inversor") {
          if (!room.shells.length) {
            throw new WarningError("Não há cartucho na câmara para inverter.");
          }
          room.shells[0] = room.shells[0] === "live" ? "blank" : "live";
          await sendSuccessReply(
            `🔌 ${formatTag(currentPlayer, room.players)} usou o *Inversor*! O cartucho atual na câmara foi trocado.`,
            [activeActorJid]
          );
          return;
        }
      }

      // 6. ATIRAR EM SI MESMO
      if (sub === "self" || sub === "eu" || sub === "mim") {
        const shell = room.shells.shift();
        const damage = currentPlayer.sawActive ? 2 : 1;
        currentPlayer.sawActive = false;

        if (shell === "blank") {
          const msg =
            `🔵 *CLICK (VAZIO)!*\n` +
            `${formatTag(currentPlayer, room.players)} atirou em si mesmo e o cartucho era vazio!\n` +
            `⚡ *Bônus:* você joga de novo!`;

          const ended = await checkRoundOrWinner(msg);
          if (!ended) {
            await sendSuccessReply(
              `${msg}\n\n${formatBoard(room)}`,
              collectMentions(room)
            );
          }
          return;
        } else {
          currentPlayer.hp = Math.max(0, currentPlayer.hp - damage);
          const eliminatedText =
            currentPlayer.hp === 0
              ? `\n💀 ${formatTag(currentPlayer, room.players)} foi eliminado!`
              : "";

          const { skipped } = advanceTurn(room, activeActorJid);

          const msg =
            `🔴 *BANG (REAL)!*\n` +
            `${formatTag(currentPlayer, room.players)} atirou em si mesmo e perdeu *-${damage} HP* (${currentPlayer.hp}/${MAX_HP} HP).${eliminatedText}`;

          const ended = await checkRoundOrWinner(msg, skipped);
          if (!ended) {
            await sendSuccessReply(
              `${msg}\n\n${formatBoard(room, skipped)}`,
              collectMentions(room, skipped)
            );
          }
          return;
        }
      }

      // 7. ATIRAR EM UM RIVAL
      const alivePlayers = getAlivePlayers(room);
      const rivals = alivePlayers.filter((p) => !isSamePlayer(p));
      const targetPlayer = resolveTargetPlayer(rivals, rawMentions, args);

      if (!targetPlayer) {
        throw new WarningError(
          `Esse jogador não está vivo na partida atual ou não foi marcado corretamente. Use \`${PREFIX}buckshot @fulano\` ou \`${PREFIX}buckshot self\`.`
        );
      }

      const shell = room.shells.shift();
      const damage = currentPlayer.sawActive ? 2 : 1;
      currentPlayer.sawActive = false;

      if (shell === "live") {
        targetPlayer.hp = Math.max(0, targetPlayer.hp - damage);
        const eliminatedText =
          targetPlayer.hp === 0
            ? `\n💀 ${formatTag(targetPlayer, room.players)} foi eliminado!`
            : "";

        const { skipped } = advanceTurn(room, activeActorJid);

        const msg =
          `🔴 *BANG (REAL)!*\n` +
          `${formatTag(currentPlayer, room.players)} atirou em ${formatTag(targetPlayer, room.players)} e causou *-${damage} HP* (${targetPlayer.hp}/${MAX_HP} HP).${eliminatedText}`;

        const ended = await checkRoundOrWinner(msg, skipped);
        if (!ended) {
          await sendSuccessReply(
            `${msg}\n\n${formatBoard(room, skipped)}`,
            collectMentions(room, [targetPlayer.jid, ...skipped])
          );
        }
        return;
      } else {
        const { skipped } = advanceTurn(room, activeActorJid);

        const msg =
          `🔵 *CLICK (VAZIO)!*\n` +
          `${formatTag(currentPlayer, room.players)} puxou o gatilho em ${formatTag(targetPlayer, room.players)}, mas o cartucho era vazio! Nenhum dano.`;

        const ended = await checkRoundOrWinner(msg, skipped);
        if (!ended) {
          await sendSuccessReply(
            `${msg}\n\n${formatBoard(room, skipped)}`,
            collectMentions(room, [targetPlayer.jid, ...skipped])
          );
        }
        return;
      }
    } catch (error) {
      await sendErrorReply(
        error.message || "Erro ao executar o comando do Buckshot Roulette."
      );
    }
  },
};
