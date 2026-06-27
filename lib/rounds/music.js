// Round 5 — Music. A buzzer round with lockout. The host arms the buzzer; the
// first rep whose message reaches the server wins and locks everyone else out.
// Because the server processes WebSocket messages one at a time, "first to arrive
// wins" is naturally race-safe — no shared timestamp arbitration needed.
//
// Flow per question:
//   host ARM_BUZZER  -> armed, no winner
//   rep buzzes       -> first one becomes winnerId, buzzer locks (armed=false)
//   host MARK_BUZZ {correct:true}  -> winner scores, question settled
//   host MARK_BUZZ {correct:false} -> winner locked out, host re-arms for the rest
//   host CLEAR_BUZZER -> reset who-buzzed without scoring

function applyGrade(rt, game, teamId, points) {
  const prev = rt.graded[teamId] || 0;
  const team = game.teams.get(teamId);
  if (team) team.score += points - prev;
  rt.graded[teamId] = points;
}

export default {
  type: 'music',

  init() {
    return { qIndex: 0, revealed: false, armed: false, winnerId: null, lockedOut: [], graded: {}, playing: false, restartAt: 0 };
  },

  count(def) {
    return (def.questions || []).length;
  },

  onSeek(rt) {
    rt.revealed = false;
    rt.armed = false;
    rt.winnerId = null;
    rt.lockedOut = [];
    rt.graded = {};
    rt.playing = false;
    rt.restartAt = 0;
  },

  hostAction(rt, def, action, payload, game) {
    const s = game.config.scoring;
    switch (action) {
      case 'armBuzzer':
        rt.armed = true;
        rt.winnerId = null;
        return true;
      case 'clearBuzzer':
        rt.armed = false;
        rt.winnerId = null;
        rt.lockedOut = [];
        return true;
      case 'musicSetPlaying':
        rt.playing = !!payload.playing;
        return true;
      case 'musicRestart':
        rt.playing = true;
        rt.restartAt = Date.now(); // TV seeks the clip to 0 and plays
        return true;
      case 'markBuzz': {
        if (!rt.winnerId) return false;
        const q = (def.questions || [])[rt.qIndex] || {};
        const teamId = rt.winnerId;
        if (payload.correct) {
          applyGrade(rt, game, teamId, s.music);
          rt.armed = false; // settled
          game.recordResult({
            roundIndex: game.roundIndex, qIndex: rt.qIndex, teamId,
            question: q.q ?? '', answer: q.a ?? null,
            response: 'Buzzed first — correct', correct: true, points: s.music,
          });
        } else {
          if (s.musicPenalty) applyGrade(rt, game, teamId, -s.musicPenalty);
          if (!rt.lockedOut.includes(teamId)) rt.lockedOut.push(teamId);
          rt.winnerId = null;
          rt.armed = false; // host re-arms to reopen for the rest
          game.recordResult({
            roundIndex: game.roundIndex, qIndex: rt.qIndex, teamId,
            question: q.q ?? '', answer: q.a ?? null,
            response: 'Buzzed — wrong', correct: false, points: s.musicPenalty ? -s.musicPenalty : 0,
          });
        }
        return true;
      }
      default:
        return false;
    }
  },

  // Any answer message from a rep is a buzz. The guard makes only the first one
  // (while armed, no winner yet, not already locked out) take effect.
  answer(rt, def, team) {
    if (!rt.armed || rt.winnerId || rt.lockedOut.includes(team.id)) return false;
    rt.winnerId = team.id;
    rt.armed = false; // lock out everyone else
    return true;
  },

  publicState(rt, def, role, game) {
    const q = (def.questions || [])[rt.qIndex] || {};
    const isHost = role === 'host';
    return {
      kind: 'music',
      qIndex: rt.qIndex,
      count: (def.questions || []).length,
      revealed: rt.revealed,
      prompt: q.q ?? '',
      // Audio source is only handed to the host (and TV) so it can be played from
      // the console; reps shouldn't auto-download the clip.
      audio: role === 'host' || role === 'tv' ? q.audio ?? null : null,
      armed: rt.armed,
      playing: rt.playing,
      restartAt: rt.restartAt,
      winnerId: rt.winnerId,
      lockedOut: rt.lockedOut,
      graded: isHost || rt.revealed ? rt.graded : undefined,
      answer: isHost || rt.revealed ? q.a ?? null : null,
      answerImage: isHost || rt.revealed ? q.answerImage ?? null : null,
    };
  },
};
