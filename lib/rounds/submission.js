// Shared engine for rounds where every team submits an answer on their phone and
// the host opens/closes submissions, reveals, and grades. Powers:
//   - Round 2 Match (grading: 'auto'  — exact per-pair comparison)
//   - Round 3 Jet Setters (grading: 'manual' — host marks each free-text answer)
//   - Round 4 Invisibles  (grading: 'manual' — image prompt, free-text answer)
//
// Grading is reversible per question via rt.graded, so re-grading never double-counts.

function applyGrade(rt, game, teamId, points) {
  const prev = rt.graded[teamId] || 0;
  const team = game.teams.get(teamId);
  if (team) team.score += points - prev;
  rt.graded[teamId] = points;
}

export function makeSubmissionRound({ type, grading, pointsKey }) {
  return {
    type,
    grading,

    init(def, game) {
      const rt = { qIndex: 0, revealed: false, open: false, submissions: {}, graded: {} };
      return rt;
    },

    count(def) {
      return (def.questions || []).length;
    },

    onSeek(rt) {
      rt.revealed = false;
      rt.open = false;
      rt.submissions = {};
      rt.graded = {};
    },

    hostAction(rt, def, action, payload, game) {
      const q = (def.questions || [])[rt.qIndex] || {};
      switch (action) {
        case 'openAnswers':
          rt.open = true;
          return true;
        case 'closeAnswers':
          rt.open = false;
          return true;

        case 'autoGrade': {
          if (grading !== 'auto') return false;
          const per = game.config.scoring.matchPair;
          for (const teamId of game.teams.keys()) {
            const sub = rt.submissions[teamId] || {};
            let correct = 0;
            for (const [k, v] of Object.entries(q.answer || {})) {
              if (String(sub[k] || '').toUpperCase() === String(v).toUpperCase()) correct++;
            }
            applyGrade(rt, game, teamId, correct * per);
          }
          return true;
        }

        case 'gradeTeam': {
          if (grading !== 'manual') return false;
          const points = payload.correct ? game.config.scoring[pointsKey] : 0;
          applyGrade(rt, game, payload.teamId, points);
          return true;
        }

        default:
          return false;
      }
    },

    // A rep submits. value shape depends on the round: a {num:letter} map for
    // match, a string for the text rounds. Only accepted while answers are open.
    answer(rt, def, team, payload) {
      if (!rt.open) return false;
      rt.submissions[team.id] = payload?.value ?? '';
      return true;
    },

    publicState(rt, def, role, game) {
      const q = (def.questions || [])[rt.qIndex] || {};
      const isHost = role === 'host';
      const base = {
        kind: type,
        qIndex: rt.qIndex,
        count: (def.questions || []).length,
        revealed: rt.revealed,
        open: rt.open,
        grading,
        prompt: q.prompt ?? q.q ?? '',
        media: q.image ?? null,
        answer: isHost || rt.revealed ? q.a ?? null : null,
        submittedTeamIds: Object.keys(rt.submissions),
      };
      if (type === 'match') {
        base.left = q.left ?? [];
        base.right = q.right ?? [];
        base.answerKey = isHost || rt.revealed ? q.answer ?? null : null;
      }
      // Host (and, after reveal, everyone) can see what each team submitted and
      // the points awarded so the quizmaster can grade/verify.
      if (isHost || rt.revealed) {
        base.submissions = rt.submissions;
        base.graded = rt.graded;
      }
      return base;
    },
  };
}
