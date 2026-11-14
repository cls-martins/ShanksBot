/*
Database dos comandos de casar
*/

import fs from "fs";
import path from "path";

const dbPath = path.resolve("src/database/marriages.json");

function ensureDatabase() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(
      dbPath,
      JSON.stringify({ marriages: {}, blockedUsers: [], pendingTrisais: {} }, null, 2)
    );
  }
}

function readData() {
  ensureDatabase();
  try {
    const fileData = fs.readFileSync(dbPath, "utf-8");
    const data = JSON.parse(fileData);
    if (!data.blockedUsers) data.blockedUsers = [];
    if (!data.pendingTrisais) data.pendingTrisais = {};
    return data;
  } catch (error) {
    return { marriages: {}, blockedUsers: [], pendingTrisais: {} };
  }
}

function saveData(data) {
  ensureDatabase();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Retorna os parceiros da pessoa no grupo (retorna Array)
export function getSpouses(groupJid, userJid) {
  const data = readData();
  const groupMarriages = data.marriages[groupJid] || {};
  return groupMarriages[userJid] || [];
}

// Alias de compatibilidade antiga
export function getSpouse(groupJid, userJid) {
  const spouses = getSpouses(groupJid, userJid);
  return spouses.length > 0 ? spouses[0] : null;
}

// Cria um casamento (casal ou trisal)
export function setGroupUnion(groupJid, membersArray) {
  const data = readData();
  if (!data.marriages[groupJid]) {
    data.marriages[groupJid] = {};
  }

  membersArray.forEach((member) => {
    const partners = membersArray.filter((m) => m !== member);
    data.marriages[groupJid][member] = partners;
  });

  saveData(data);
}

// Alias de compatibilidade antiga
export function addMarriage(groupJid, user1, user2) {
  setGroupUnion(groupJid, [user1, user2]);
}

// Remove o casamento/trisal de quem pedir divórcio
export function removeMarriage(groupJid, user1) {
  const data = readData();
  const groupMarriages = data.marriages[groupJid] || {};
  const partners = groupMarriages[user1] || [];

  if (partners.length > 0) {
    const allMembers = [user1, ...partners];
    allMembers.forEach((m) => {
      delete data.marriages[groupJid][m];
    });
    saveData(data);
    return partners;
  }
  return null;
}

// Retorna todos os casais/trisais do grupo
export function getGroupMarriages(groupJid) {
  const data = readData();
  const groupMarriages = data.marriages[groupJid] || {};
  const unions = [];
  const visited = new Set();

  for (const [u1, partners] of Object.entries(groupMarriages)) {
    if (!visited.has(u1)) {
      const group = [u1, ...partners].sort();
      unions.push(group);
      group.forEach((m) => visited.add(m));
    }
  }

  return unions;
}

// Alterna proteção pessoal contra casamentos (!ncasar)
export function toggleUserMarriageBlock(userJid) {
  const data = readData();
  const index = data.blockedUsers.indexOf(userJid);
  let isBlocked = false;

  if (index > -1) {
    data.blockedUsers.splice(index, 1);
    isBlocked = false;
  } else {
    data.blockedUsers.push(userJid);
    isBlocked = true;
  }

  saveData(data);
  return isBlocked;
}

export function isUserMarriageBlocked(userJid) {
  const data = readData();
  return (data.blockedUsers || []).includes(userJid);
}

// === GERENCIAMENTO DE PEDIDOS DE TRISAL ===

export function createTrisalRequest(groupJid, requesterJid, partner1Jid, partner2Jid) {
  const data = readData();
  if (!data.pendingTrisais) data.pendingTrisais = {};

  const requestId = `${groupJid}_${requesterJid}`;
  data.pendingTrisais[requestId] = {
    groupJid,
    requester: requesterJid,
    targetCouple: [partner1Jid, partner2Jid],
    approvals: [],
  };

  saveData(data);
  return requestId;
}

export function getPendingTrisal(groupJid, requesterJid) {
  const data = readData();
  return data.pendingTrisais?.[`${groupJid}_${requesterJid}`] || null;
}

export function approveTrisalRequest(groupJid, requesterJid, approverJid) {
  const data = readData();
  const requestId = `${groupJid}_${requesterJid}`;
  const request = data.pendingTrisais?.[requestId];

  if (!request) return null;

  if (!request.approvals.includes(approverJid)) {
    request.approvals.push(approverJid);
  }

  if (request.approvals.length >= 2) {
    const fullTrisal = [request.requester, ...request.targetCouple];
    delete data.pendingTrisais[requestId];
    saveData(data);
    setGroupUnion(groupJid, fullTrisal);
    return { completed: true, members: fullTrisal };
  }

  saveData(data);
  return { completed: false, pendingFrom: request.targetCouple.find((m) => !request.approvals.includes(m)) };
}

export function cancelTrisalRequest(groupJid, requesterJid) {
  const data = readData();
  const requestId = `${groupJid}_${requesterJid}`;
  if (data.pendingTrisais?.[requestId]) {
    delete data.pendingTrisais[requestId];
    saveData(data);
  }
}
