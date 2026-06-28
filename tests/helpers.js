// Shared test helpers. Round engines are pure functions over (rt, def, team, game),
// so we drive them with a minimal fake game instead of standing up the server.
import { DEFAULT_SCORING } from '../lib/protocol.js';

// A stand-in for lib/game.js Game with just what the round modules touch: a teams
// Map, join order, scoring config, and the timer hooks. Mirrors Game.startTimer's
// quads bookkeeping so the pass timer math is exercised.
export function fakeGame(teamIds = [], scoringOverrides = {}) {
  return {
    teams: new Map(teamIds.map((id) => [id, { id, name: id, score: 0 }])),
    teamOrder: [...teamIds],
    config: { scoring: { ...DEFAULT_SCORING, ...scoringOverrides } },
    timer: null,
    module: null,
    rt: null,
    startTimer(seconds) {
      this.timer = { id: 'timer', durationSec: seconds };
      if (this.module?.type === 'quads' && this.rt?.status === 'asking') this.rt.directTimerSec = seconds;
      return this.timer;
    },
    stopTimer() {
      this.timer = null;
    },
  };
}

export const scoreOf = (game, id) => game.teams.get(id)?.score;
