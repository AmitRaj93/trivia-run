// Authoritative in-memory game state, server-side only. One Game per room.
// State is broadcast as role-aware full snapshots, so clients never reconcile
// diffs and reps never receive answer keys before the host reveals them.

import { randomUUID } from 'crypto';
import { PHASES, MAX_TEAMS, DEFAULT_SCORING, ACTIONS } from './protocol.js';
import { loadQuiz } from './content.js';
import { getRoundModule } from './rounds/index.js';

const rooms = new Map(); // roomCode -> Game
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1

function makeRoomCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () =>
      ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)]
    ).join('');
  } while (rooms.has(code));
  return code;
}

export class Game {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.phase = PHASES.LOBBY;
    this.config = { maxTeams: MAX_TEAMS, scoring: { ...DEFAULT_SCORING } };

    this.teams = new Map(); // teamId -> { id, name, score, repToken, repConnected }
    this.teamOrder = []; // teamIds in approval order (drives Round 1 rotation)
    this.pending = new Map(); // reqId -> { reqId, teamName, repName }

    this.quiz = loadQuiz();
    this.config.scoring = { ...this.config.scoring, ...this.quiz.scoring };

    this.roundIndex = null; // index into quiz.rounds
    this.rt = null; // active round runtime state
    this.module = null; // active round module
  }

  // ---- admission ----------------------------------------------------------
  addPending(teamName, repName) {
    const reqId = randomUUID();
    this.pending.set(reqId, {
      reqId,
      teamName: String(teamName || 'Team').slice(0, 24),
      repName: String(repName || '').slice(0, 24),
    });
    return reqId;
  }

  removePending(reqId) {
    return this.pending.delete(reqId);
  }

  // Approve a pending request into a real team. Returns the team, or an error.
  approveTeam(reqId) {
    const req = this.pending.get(reqId);
    if (!req) return { error: 'Request no longer exists' };
    if (this.teams.size >= this.config.maxTeams) return { error: 'Team limit reached' };
    const id = randomUUID();
    const team = {
      id,
      name: req.teamName,
      repName: req.repName,
      score: 0,
      repToken: randomUUID(),
      repConnected: true,
    };
    this.teams.set(id, team);
    this.teamOrder.push(id);
    this.pending.delete(reqId);
    return { team };
  }

  reconnectRep(teamId, token) {
    const team = this.teams.get(teamId);
    if (!team || team.repToken !== token) return null;
    team.repConnected = true;
    return team;
  }

  setRepConnected(teamId, connected) {
    const t = this.teams.get(teamId);
    if (t) t.repConnected = connected;
  }

  // ---- round flow ---------------------------------------------------------
  get currentRoundDef() {
    return this.roundIndex == null ? null : this.quiz.rounds[this.roundIndex];
  }

  enterRound(index) {
    if (index < 0 || index >= this.quiz.rounds.length) return false;
    this.roundIndex = index;
    this.phase = PHASES.IN_ROUND;
    this.module = getRoundModule(this.quiz.rounds[index].type);
    this.rt = this.module.init(this.quiz.rounds[index], this);
    return true;
  }

  seek(delta) {
    if (!this.module) return false;
    const count = this.module.count(this.currentRoundDef);
    const next = Math.min(Math.max((this.rt.qIndex ?? 0) + delta, 0), Math.max(count - 1, 0));
    if (next === this.rt.qIndex) return false;
    this.rt.qIndex = next;
    this.module.onSeek(this.rt, this.currentRoundDef, this);
    return true;
  }

  // ---- host actions -------------------------------------------------------
  handleAction(action, payload = {}) {
    switch (action) {
      case ACTIONS.RENAME_TEAM: {
        const t = this.teams.get(payload.teamId);
        if (!t) return false;
        t.name = String(payload.name || t.name).slice(0, 24);
        return true;
      }
      case ACTIONS.REMOVE_TEAM: {
        if (!this.teams.delete(payload.teamId)) return false;
        this.teamOrder = this.teamOrder.filter((id) => id !== payload.teamId);
        return true;
      }
      case ACTIONS.ADJUST_SCORE: {
        const t = this.teams.get(payload.teamId);
        if (!t) return false;
        t.score += Number(payload.delta) || 0;
        return true;
      }
      case ACTIONS.SET_SCORE: {
        const t = this.teams.get(payload.teamId);
        if (!t) return false;
        t.score = Number(payload.score) || 0;
        return true;
      }
      case ACTIONS.RESET: {
        this.phase = PHASES.LOBBY;
        this.roundIndex = null;
        this.rt = null;
        this.module = null;
        for (const t of this.teams.values()) t.score = 0;
        return true;
      }
      case ACTIONS.START_QUIZ:
        return this.enterRound(0);
      case ACTIONS.GOTO_ROUND:
        return this.enterRound(Number(payload.index));
      case ACTIONS.NEXT_QUESTION:
        return this.seek(1);
      case ACTIONS.PREV_QUESTION:
        return this.seek(-1);
      case ACTIONS.REVEAL:
        if (!this.rt) return false;
        this.rt.revealed = true;
        return true;
      case ACTIONS.HIDE:
        if (!this.rt) return false;
        this.rt.revealed = false;
        return true;
      case ACTIONS.FINISH:
        this.phase = PHASES.FINISHED;
        return true;
      default:
        // delegate round-specific actions to the active module
        if (this.module) return this.module.hostAction(this.rt, this.currentRoundDef, action, payload, this);
        return false;
    }
  }

  handleAnswer(teamId, payload) {
    if (!this.module) return false;
    const team = this.teams.get(teamId);
    if (!team) return false;
    return this.module.answer(this.rt, this.currentRoundDef, team, payload, this);
  }

  // ---- snapshot -----------------------------------------------------------
  snapshot(role = 'viewer') {
    const teams = [...this.teams.values()]
      .map((t) => ({ id: t.id, name: t.name, score: t.score, repConnected: t.repConnected }))
      .sort((a, b) => b.score - a.score);

    return {
      roomCode: this.roomCode,
      phase: this.phase,
      config: this.config,
      quizTitle: this.quiz.title,
      teams,
      teamOrder: this.teamOrder,
      pending: role === 'host' ? [...this.pending.values()] : [],
      pendingCount: this.pending.size,
      rounds: this.quiz.rounds.map((r, i) => ({ index: i, type: r.type, title: r.title })),
      roundIndex: this.roundIndex,
      round:
        this.module && this.rt
          ? this.module.publicState(this.rt, this.currentRoundDef, role, this)
          : null,
    };
  }
}

export function createRoom() {
  const code = makeRoomCode();
  const game = new Game(code);
  rooms.set(code, game);
  return game;
}

export function getRoom(code) {
  return rooms.get(String(code || '').toUpperCase());
}

export function deleteRoom(code) {
  rooms.delete(code);
}
