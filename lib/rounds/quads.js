// Round 1 — Quads. Several sets of questions (set sizes come from the content —
// e.g. 4 per set). The direct rotates through the teams within each set; a missed
// direct passes round-robin to the other teams, starting from the team after the
// direct. The set indicator advances at each set boundary; the question indicator
// counts across the whole round.
//
// Timers: the quizmaster starts a "direct" timer for the team on the direct. When
// the question is passed, the pass timer auto-resets to HALF the direct timer and
// restarts for each team that gets the pass.
//
// Grading is reversible per question (rt.awarded), so a mis-click never sticks.

const DEFAULT_DIRECT_SEC = 60; // fallback if no direct timer was started

function flatQuestions(def) {
  return def.sets.flatMap((s) => s.questions);
}

// Map a flat question index to its set + position within that set, using the
// ACTUAL set sizes (sets may have any length — 4, 12, mixed, …).
function locate(def, qIndex) {
  let idx = qIndex;
  for (let s = 0; s < def.sets.length; s++) {
    const size = def.sets[s].questions.length;
    if (idx < size) return { setIndex: s, qInSet: idx, setSize: size };
    idx -= size;
  }
  const last = Math.max(0, def.sets.length - 1);
  const size = def.sets[last]?.questions.length ?? 0;
  return { setIndex: last, qInSet: Math.max(0, size - 1), setSize: size };
}

function directTeamFor(qIndex, def, game) {
  const order = game.teamOrder;
  if (order.length === 0) return null;
  const { qInSet } = locate(def, qIndex); // rotation restarts each set
  return order[qInSet % order.length];
}

// Round-robin order of teams that get the pass: everyone except the direct team,
// starting from the team immediately after the direct in join order.
function buildPassQueue(directTeamId, game) {
  const order = game.teamOrder.filter((id) => game.teams.has(id));
  if (order.length <= 1) return [];
  const start = order.indexOf(directTeamId);
  const queue = [];
  for (let i = 1; i < order.length; i++) {
    queue.push(order[(start + i + order.length) % order.length]);
  }
  return queue; // direct excluded; first element is the team after the direct
}

function applyAwards(rt, game, awards) {
  for (const [teamId, pts] of Object.entries(rt.awarded)) {
    const t = game.teams.get(teamId);
    if (t) t.score -= pts;
  }
  rt.awarded = {};
  for (const [teamId, pts] of Object.entries(awards)) {
    const t = game.teams.get(teamId);
    if (t) {
      t.score += pts;
      rt.awarded[teamId] = pts;
    }
  }
}

function startPassTimer(rt, game) {
  const base = rt.directTimerSec || DEFAULT_DIRECT_SEC;
  game.startTimer(Math.max(1, Math.round(base / 2)));
}

export default {
  type: 'quads',

  init(def, game) {
    const rt = {
      qIndex: 0,
      revealed: false,
      status: 'asking',
      directTeamId: null,
      directTimerSec: null,
      passQueue: [],
      passPos: 0,
      awarded: {},
    };
    this.onSeek(rt, def, game);
    return rt;
  },

  count(def) {
    return flatQuestions(def).length;
  },

  onSeek(rt, def, game) {
    rt.revealed = false;
    rt.status = 'asking';
    rt.awarded = {};
    rt.directTimerSec = null;
    rt.passQueue = [];
    rt.passPos = 0;
    rt.directTeamId = directTeamFor(rt.qIndex, def, game);
  },

  hostAction(rt, def, action, payload, game) {
    const s = game.config.scoring;
    const q = flatQuestions(def)[rt.qIndex] || {};
    const track = (teamId, response, correct, points) =>
      game.recordResult({
        roundIndex: game.roundIndex, qIndex: rt.qIndex, teamId,
        question: q.q ?? '', answer: q.a ?? null, response, correct, points,
      });
    switch (action) {
      case 'quadsSetDirect':
        if (rt.status === 'asking' && game.teams.has(payload.teamId)) {
          rt.directTeamId = payload.teamId;
          return true;
        }
        return false;

      case 'quadsMarkDirect':
        if (payload.correct) {
          applyAwards(rt, game, rt.directTeamId ? { [rt.directTeamId]: s.direct } : {});
          if (rt.directTeamId) track(rt.directTeamId, 'Direct — correct', true, s.direct);
          rt.status = 'done';
          game.stopTimer();
        } else {
          applyAwards(rt, game, {}); // nobody scores on a missed direct
          if (rt.directTeamId) track(rt.directTeamId, 'Direct — missed', false, 0);
          rt.passQueue = buildPassQueue(rt.directTeamId, game);
          rt.passPos = 0;
          if (rt.passQueue.length === 0) {
            rt.status = 'done';
            game.stopTimer();
          } else {
            rt.status = 'passing';
            startPassTimer(rt, game); // half the direct timer, for the first pass team
          }
        }
        return true;

      case 'quadsMarkPass': {
        if (rt.status !== 'passing') return false;
        const current = rt.passQueue[rt.passPos];
        if (payload.correct) {
          applyAwards(rt, game, current ? { [current]: s.pass } : {});
          if (current) track(current, 'Pass — correct', true, s.pass);
          rt.status = 'done';
          game.stopTimer();
        } else {
          if (current) track(current, 'Pass — missed', false, 0);
          rt.passPos += 1;
          if (rt.passPos >= rt.passQueue.length) {
            applyAwards(rt, game, {}); // pass exhausted, nobody scored
            rt.status = 'done';
            game.stopTimer();
          } else {
            startPassTimer(rt, game); // reset + restart the pass timer for the next team
          }
        }
        return true;
      }

      case 'quadsPassNone':
        applyAwards(rt, game, {});
        rt.status = 'done';
        game.stopTimer();
        return true;

      default:
        return false;
    }
  },

  answer() {
    return false; // answered aloud
  },

  publicState(rt, def, role, game) {
    const questions = flatQuestions(def);
    const q = questions[rt.qIndex] || {};
    const { setIndex, qInSet, setSize } = locate(def, rt.qIndex);
    const passTeamId = rt.status === 'passing' ? rt.passQueue[rt.passPos] ?? null : null;
    return {
      kind: 'quads',
      qIndex: rt.qIndex,
      count: questions.length,
      setIndex,
      setCount: def.sets.length,
      qInSet,
      perSet: setSize,
      directTeamId: rt.directTeamId,
      status: rt.status, // 'asking' | 'passing' | 'done'
      passTeamId,
      passNumber: rt.status === 'passing' ? rt.passPos + 1 : 0,
      passTotal: rt.passQueue.length,
      revealed: rt.revealed,
      prompt: q.q ?? '',
      media: q.media ?? null,
      answer: role === 'host' || rt.revealed ? q.a ?? '' : null,
      answerImage: role === 'host' || rt.revealed ? q.answerImage ?? null : null,
    };
  },
};
