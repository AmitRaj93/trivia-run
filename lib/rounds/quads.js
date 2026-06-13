// Round 1 — Quads. Three sets of 12 questions. With 4 teams, each set rotates a
// direct question to every team three times (4 x 3 = 12). A missed direct passes
// to the other teams for fewer points. Answered aloud; the quizmaster grades.
//
// Grading is reversible per question: re-marking a question first undoes whatever
// it awarded before, so a mis-click never permanently inflates a score.

const QUESTIONS_PER_SET = 12;

function flatQuestions(def) {
  // def.sets = [{ questions: [...12] }, ...]. Flattened for linear navigation.
  return def.sets.flatMap((s) => s.questions);
}

function directTeamFor(qIndex, game) {
  const order = game.teamOrder;
  if (order.length === 0) return null;
  const qInSet = qIndex % QUESTIONS_PER_SET;
  return order[qInSet % order.length];
}

// Undo this question's previous awards, then apply a fresh set. `awards` maps
// teamId -> points for the current question only.
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

export default {
  type: 'quads',

  init(def, game) {
    const rt = { qIndex: 0, revealed: false, status: 'asking', directTeamId: null, awarded: {} };
    this.onSeek(rt, def, game);
    return rt;
  },

  count(def) {
    return flatQuestions(def).length;
  },

  // Called whenever the current question changes. Resets per-question state and
  // recomputes whose direct it is by rotation (host can still override).
  onSeek(rt, def, game) {
    rt.revealed = false;
    rt.status = 'asking';
    rt.awarded = {};
    rt.directTeamId = directTeamFor(rt.qIndex, game);
  },

  hostAction(rt, def, action, payload, game) {
    const s = game.config.scoring;
    switch (action) {
      case 'quadsSetDirect':
        if (game.teams.has(payload.teamId)) {
          rt.directTeamId = payload.teamId;
          return true;
        }
        return false;

      case 'quadsMarkDirect':
        if (payload.correct) {
          applyAwards(rt, game, rt.directTeamId ? { [rt.directTeamId]: s.direct } : {});
          rt.status = 'done';
        } else {
          applyAwards(rt, game, {}); // undo, nobody scores on the direct
          rt.status = 'passing';
        }
        return true;

      case 'quadsAwardPass':
        if (!game.teams.has(payload.teamId)) return false;
        applyAwards(rt, game, { [payload.teamId]: s.pass });
        rt.status = 'done';
        return true;

      case 'quadsPassNone':
        applyAwards(rt, game, {});
        rt.status = 'done';
        return true;

      default:
        return false;
    }
  },

  answer() {
    return false; // Round 1 is answered aloud; reps have no input.
  },

  publicState(rt, def, role, game) {
    const questions = flatQuestions(def);
    const q = questions[rt.qIndex] || {};
    const setIndex = Math.floor(rt.qIndex / QUESTIONS_PER_SET);
    return {
      kind: 'quads',
      qIndex: rt.qIndex,
      count: questions.length,
      setIndex,
      setCount: def.sets.length,
      qInSet: rt.qIndex % QUESTIONS_PER_SET,
      perSet: QUESTIONS_PER_SET,
      directTeamId: rt.directTeamId,
      status: rt.status, // 'asking' | 'passing' | 'done'
      revealed: rt.revealed,
      prompt: q.q ?? '',
      media: q.media ?? null,
      answer: role === 'host' || rt.revealed ? q.a ?? '' : null,
    };
  },
};
