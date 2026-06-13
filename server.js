// Custom server: Next.js HTTP handler + a WebSocket layer for real-time sync.
// Run with `npm run dev`. All game state lives in memory (see lib/game.js), the
// right model for a single live event on one host machine.

import { createServer } from 'http';
import next from 'next';
import { WebSocketServer } from 'ws';
import { createRoom, getRoom, serializeRooms, restoreRooms } from './lib/game.js';
import { ROLES, C2S, S2C, ACTIONS } from './lib/protocol.js';
import { scheduleSave, loadState } from './lib/persistence.js';

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT) || 3000;
const app = next({ dev });
const handle = app.getRequestHandler();

const roomClients = new Map(); // roomCode -> Set<ws>
const roomTimers = new Map(); // roomCode -> setTimeout handle

function addClientToRoom(code, ws) {
  if (!roomClients.has(code)) roomClients.set(code, new Set());
  roomClients.get(code).add(ws);
}
function removeClientFromRoom(code, ws) {
  const set = roomClients.get(code);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) roomClients.delete(code);
}
function send(ws, type, data = {}) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, ...data }));
}

// Keep the server's expiry setTimeout in step with whatever the game's timer is
// now (started, stopped, replaced by a pass timer, cleared on navigation, …).
function reconcileTimer(game) {
  const cur = roomTimers.get(game.roomCode);
  if (!game.timer) {
    if (cur) {
      clearTimeout(cur.handle);
      roomTimers.delete(game.roomCode);
    }
    return;
  }
  if (cur && cur.id === game.timer.id) return; // already scheduled
  if (cur) clearTimeout(cur.handle);
  const id = game.timer.id;
  const delay = Math.max(0, game.timer.endsAt - Date.now());
  const handle = setTimeout(() => {
    roomTimers.delete(game.roomCode);
    if (game.expireTimer(id)) broadcastState(game);
  }, delay);
  roomTimers.set(game.roomCode, { id, handle });
}

// One snapshot per role, computed lazily, sent to every client in the room.
function broadcastState(game) {
  const set = roomClients.get(game.roomCode);
  if (set) {
    const byRole = {};
    for (const ws of set) {
      if (ws.readyState !== ws.OPEN) continue;
      const role = ws.role || ROLES.VIEWER;
      if (!byRole[role]) byRole[role] = JSON.stringify({ type: S2C.STATE, state: game.snapshot(role) });
      ws.send(byRole[role]);
    }
  }
  reconcileTimer(game);
  scheduleSave(serializeRooms);
}

function findWs(code, predicate) {
  const set = roomClients.get(code);
  if (!set) return null;
  for (const ws of set) if (predicate(ws)) return ws;
  return null;
}

function handleAction(ws, msg) {
  const game = getRoom(ws.roomCode);
  if (!game || ws.role !== ROLES.HOST) return; // only the host mutates state

  // Admission actions need access to the requester's socket, so they're handled
  // here rather than inside the pure game model.
  if (msg.action === ACTIONS.APPROVE_TEAM) {
    const result = game.approveTeam(msg.payload?.reqId);
    if (result.error) return send(ws, S2C.ERROR, { message: result.error });
    const target = findWs(game.roomCode, (c) => c.pendingReqId === msg.payload.reqId);
    if (target) {
      target.role = ROLES.REP;
      target.teamId = result.team.id;
      target.pendingReqId = null;
      send(target, S2C.JOINED, {
        roomCode: game.roomCode,
        role: ROLES.REP,
        teamId: result.team.id,
        repToken: result.team.repToken,
      });
    }
    return broadcastState(game);
  }

  if (msg.action === ACTIONS.REJECT_TEAM) {
    const target = findWs(game.roomCode, (c) => c.pendingReqId === msg.payload?.reqId);
    game.removePending(msg.payload?.reqId);
    if (target) {
      target.pendingReqId = null;
      send(target, S2C.REJECTED, {});
    }
    return broadcastState(game);
  }

  if (game.handleAction(msg.action, msg.payload)) broadcastState(game);
}

function handleMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return send(ws, S2C.ERROR, { message: 'Bad message' });
  }

  switch (msg.type) {
    case C2S.CREATE: {
      const game = createRoom();
      ws.roomCode = game.roomCode;
      ws.role = ROLES.HOST;
      addClientToRoom(game.roomCode, ws);
      send(ws, S2C.JOINED, { roomCode: game.roomCode, role: ROLES.HOST });
      broadcastState(game);
      break;
    }

    case C2S.REQUEST_TEAM: {
      const game = getRoom(msg.roomCode);
      if (!game) return send(ws, S2C.ERROR, { message: 'Room not found' });
      if (game.teams.size >= game.config.maxTeams) {
        return send(ws, S2C.ERROR, { message: 'This game is full (max teams reached)' });
      }
      const reqId = game.addPending(msg.teamName, msg.repName);
      ws.roomCode = game.roomCode;
      ws.role = ROLES.VIEWER; // pending reps watch as a viewer until approved
      ws.pendingReqId = reqId;
      addClientToRoom(game.roomCode, ws);
      send(ws, S2C.JOINED, { roomCode: game.roomCode, role: ROLES.REP, pending: true, reqId });
      broadcastState(game);
      break;
    }

    case C2S.JOIN: {
      const game = getRoom(msg.roomCode);
      if (!game) return send(ws, S2C.ERROR, { message: 'Room not found' });
      ws.roomCode = game.roomCode;

      if (msg.role === ROLES.REP) {
        // Reconnect into an existing team slot with the stored token.
        const team = game.reconnectRep(msg.teamId, msg.repToken);
        if (!team) return send(ws, S2C.ERROR, { message: 'Could not rejoin team' });
        ws.role = ROLES.REP;
        ws.teamId = team.id;
        addClientToRoom(game.roomCode, ws);
        send(ws, S2C.JOINED, { roomCode: game.roomCode, role: ROLES.REP, teamId: team.id });
      } else {
        ws.role = msg.role === ROLES.HOST ? ROLES.HOST : msg.role === ROLES.TV ? ROLES.TV : ROLES.VIEWER;
        addClientToRoom(game.roomCode, ws);
        send(ws, S2C.JOINED, { roomCode: game.roomCode, role: ws.role });
      }
      broadcastState(game);
      break;
    }

    case C2S.ACTION:
      handleAction(ws, msg);
      break;

    case C2S.ANSWER: {
      const game = getRoom(ws.roomCode);
      if (!game || ws.role !== ROLES.REP || !ws.teamId) return;
      if (game.handleAnswer(ws.teamId, msg.payload)) broadcastState(game);
      break;
    }

    default:
      send(ws, S2C.ERROR, { message: `Unknown message type: ${msg.type}` });
  }
}

app.prepare().then(async () => {
  // Restore any rooms from a previous run (crash recovery) and re-arm their timers.
  const saved = await loadState();
  if (saved) {
    const restored = restoreRooms(saved);
    if (restored.length) {
      console.log(`> restored ${restored.length} room(s) from disk: ${restored.map((g) => g.roomCode).join(', ')}`);
      for (const game of restored) reconcileTimer(game);
    }
  }

  const server = createServer((req, res) => handle(req, res));
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => handleMessage(ws, raw));
    ws.on('close', () => {
      if (!ws.roomCode) return;
      const game = getRoom(ws.roomCode);
      if (game) {
        if (ws.teamId) game.setRepConnected(ws.teamId, false);
        if (ws.pendingReqId) game.removePending(ws.pendingReqId);
        broadcastState(game);
      }
      removeClientFromRoom(ws.roomCode, ws);
    });
  });

  server.listen(port, () => {
    console.log(`> trivia-run ready on http://localhost:${port}`);
  });
});
