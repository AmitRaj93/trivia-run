// Shared engine for rounds where every team submits an answer on their phone and
// the host opens/closes submissions, reveals, and grades. Powers:
//   - Round 2 Match (grading: 'auto'  — exact per-pair comparison)
//   - Round 3 Jet Setters (grading: 'manual' — host marks each free-text answer)
//   - Round 4 Invisibles  (grading: 'manual' — image prompt, free-text answer)
//
// Text-round questions may add an optional bonus sub-question:
//   "bonus": { "q": "...", "a": "...", "points": 5 }
// Teams then get a second answer box, and the host can mark the bonus right/wrong
// to award the preset bonus points.
//
// Grading is reversible per question (via a ledger map), so re-grading or toggling
// a bonus never double-counts.

// Apply points for a team against a ledger (rt.graded or rt.bonusGraded), undoing
// whatever that ledger previously awarded this question first.
function applyGrade(rt, game, ledger, teamId, points) {
  const prev = ledger[teamId] || 0;
  const team = game.teams.get(teamId);
  if (team) team.score += points - prev;
  ledger[teamId] = points;
}

// Compact "1→C 2→A …" rendering of a Match answer/answer-key map, for the tracker.
function formatPairs(map) {
  if (!map || typeof map !== 'object') return null;
  return Object.entries(map).map(([k, v]) => `${k}→${v}`).join('  ');
}

export function makeSubmissionRound({ type, grading, pointsKey }) {
  return {
    type,
    grading,

    init() {
      return { qIndex: 0, revealed: false, open: false, submissions: {}, graded: {}, bonusSubmissions: {}, bonusGraded: {} };
    },

    count(def) {
      return (def.questions || []).length;
    },

    onSeek(rt) {
      rt.revealed = false;
      rt.open = false;
      rt.submissions = {};
      rt.graded = {};
      rt.bonusSubmissions = {};
      rt.bonusGraded = {};
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
          const allBonus = game.config.scoring.matchAllBonus || 0;
          const total = Object.keys(q.answer || {}).length;
          const keyStr = formatPairs(q.answer);
          for (const teamId of game.teams.keys()) {
            const sub = rt.submissions[teamId] || {};
            let correct = 0;
            for (const [k, v] of Object.entries(q.answer || {})) {
              if (String(sub[k] || '').toUpperCase() === String(v).toUpperCase()) correct++;
            }
            // Award per-pair points, plus a bonus when every pair is correct.
            const pts = correct * per + (total > 0 && correct === total ? allBonus : 0);
            applyGrade(rt, game, rt.graded, teamId, pts);
            game.recordResult({
              roundIndex: game.roundIndex, qIndex: rt.qIndex, teamId,
              question: q.prompt ?? q.q ?? 'Match',
              answer: keyStr,
              response: Object.keys(sub).length ? `${correct}/${total} matched` : 'no submission',
              correct: total > 0 && correct === total,
              points: pts,
            });
          }
          return true;
        }

        case 'gradeTeam': {
          if (grading !== 'manual') return false;
          const points = payload.correct ? game.config.scoring[pointsKey] : 0;
          applyGrade(rt, game, rt.graded, payload.teamId, points);
          game.recordResult({
            roundIndex: game.roundIndex, qIndex: rt.qIndex, teamId: payload.teamId,
            question: q.prompt ?? q.q ?? '',
            answer: q.a ?? null,
            response: rt.submissions[payload.teamId] ?? 'no submission',
            correct: !!payload.correct,
            points,
          });
          return true;
        }

        case 'gradeBonus': {
          if (grading !== 'manual' || !q.bonus) return false;
          const points = payload.correct ? Number(q.bonus.points) || 0 : 0;
          applyGrade(rt, game, rt.bonusGraded, payload.teamId, points);
          game.recordResult({
            roundIndex: game.roundIndex, qIndex: rt.qIndex, teamId: payload.teamId, slot: 'bonus',
            question: q.bonus.q ? `⭐ ${q.bonus.q}` : '⭐ Bonus',
            answer: q.bonus.a ?? null,
            response: rt.bonusSubmissions[payload.teamId] ?? 'no submission',
            correct: !!payload.correct,
            points,
          });
          return true;
        }

        default:
          return false;
      }
    },

    // A rep submits. `value` is the main answer (a {num:letter} map for match, a
    // string for text rounds); `bonus` is the optional bonus answer string.
    answer(rt, def, team, payload) {
      if (!rt.open) return false;
      rt.submissions[team.id] = payload?.value ?? '';
      if (payload?.bonus !== undefined) rt.bonusSubmissions[team.id] = payload.bonus;
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
        answerImage: isHost || rt.revealed ? q.answerImage ?? null : null,
        submittedTeamIds: Object.keys(rt.submissions),
      };
      if (type === 'match') {
        base.left = q.left ?? [];
        base.right = q.right ?? [];
        base.answerKey = isHost || rt.revealed ? q.answer ?? null : null;
      }
      if (q.bonus) {
        base.bonus = {
          q: q.bonus.q ?? '',
          points: Number(q.bonus.points) || 0,
          answer: isHost || rt.revealed ? q.bonus.a ?? null : null,
        };
      }
      // Host (and, after reveal, everyone) can see what each team submitted and
      // the points awarded so the quizmaster can grade/verify.
      if (isHost || rt.revealed) {
        base.submissions = rt.submissions;
        base.graded = rt.graded;
        base.bonusSubmissions = rt.bonusSubmissions;
        base.bonusGraded = rt.bonusGraded;
      }
      return base;
    },
  };
}
