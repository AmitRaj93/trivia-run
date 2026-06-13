// Shared WebSocket protocol — imported by both the Node server and the browser
// clients, so it must stay free of any Node- or browser-specific APIs.

export const ROLES = {
  HOST: 'host', // quizmaster console
  TV: 'tv', // big-screen display
  REP: 'rep', // a team's representative (answerer / buzzer), one per team
  VIEWER: 'viewer', // a spectator phone, view-only
};

// client -> server
export const C2S = {
  CREATE: 'create', // host opens a new room
  JOIN: 'join', // tv / viewer connect, or rep/host reconnect: { role, roomCode, ... }
  REQUEST_TEAM: 'requestTeam', // a would-be rep asks to join: { roomCode, teamName, repName }
  ACTION: 'action', // host mutates game state: { action, payload }
  ANSWER: 'answer', // rep submits an answer / buzz: { payload }
};

// server -> client
export const S2C = {
  JOINED: 'joined', // { roomCode, role, clientId, teamId?, repToken?, reqId?, pending? }
  STATE: 'state', // role-aware authoritative snapshot
  ERROR: 'error', // { message }
  REJECTED: 'rejected', // a pending team request was declined by the host
};

// Host actions (the `action` field of a C2S.ACTION message).
export const ACTIONS = {
  // admission + teams
  APPROVE_TEAM: 'approveTeam', // { reqId }
  REJECT_TEAM: 'rejectTeam', // { reqId }
  RENAME_TEAM: 'renameTeam', // { teamId, name }
  REMOVE_TEAM: 'removeTeam', // { teamId }
  ADJUST_SCORE: 'adjustScore', // { teamId, delta }
  SET_SCORE: 'setScore', // { teamId, score }
  RESET: 'reset', // back to lobby, scores zeroed

  // quiz flow
  START_QUIZ: 'startQuiz', // leave lobby into the first round
  GOTO_ROUND: 'gotoRound', // { index }
  NEXT_QUESTION: 'nextQuestion',
  PREV_QUESTION: 'prevQuestion',
  REVEAL: 'reveal', // reveal the answer on TV
  HIDE: 'hide', // hide the answer again
  FINISH: 'finish', // end the quiz, show final standings

  // countdown timer (shown on every surface; auto-closes answers on expiry)
  START_TIMER: 'startTimer', // { seconds }
  STOP_TIMER: 'stopTimer',

  // generic grading used by several rounds
  AWARD: 'award', // { teamId, points }
  GRADE_TEAM: 'gradeTeam', // { teamId, correct } -> awards the round's per-item points

  // Round 1 — Quads
  QUADS_SET_DIRECT: 'quadsSetDirect', // { teamId } override whose direct it is
  QUADS_MARK_DIRECT: 'quadsMarkDirect', // { correct }
  QUADS_MARK_PASS: 'quadsMarkPass', // { correct } — marks the current round-robin pass team
  QUADS_PASS_NONE: 'quadsPassNone', // end the pass with nobody scoring

  // Round 2 — Match / Round 3 — Jet Setters / Round 4 — Invisibles
  OPEN_ANSWERS: 'openAnswers', // let reps submit
  CLOSE_ANSWERS: 'closeAnswers', // lock submissions
  AUTO_GRADE: 'autoGrade', // grade submissions against the key

  // Round 5 — Music buzzer
  ARM_BUZZER: 'armBuzzer', // open the buzzer (optionally to a subset)
  CLEAR_BUZZER: 'clearBuzzer', // reset who-buzzed without scoring
  MARK_BUZZ: 'markBuzz', // { correct } score/penalise the buzzer
};

// Top-level game phases.
export const PHASES = {
  LOBBY: 'lobby',
  IN_ROUND: 'in-round',
  FINISHED: 'finished',
};

export const MAX_TEAMS = 4;

// Default, editable scoring. Lives on the game config so the console can tune it.
export const DEFAULT_SCORING = {
  direct: 10, // Round 1 correct on your own direct
  pass: 5, // Round 1 correct on a passed question
  matchPair: 5, // Round 2 per correctly matched pair
  jetSetter: 10, // Round 3 correct
  invisible: 10, // Round 4 correct
  music: 10, // Round 5 correct buzz
  musicPenalty: 0, // optional deduction for a wrong buzz
};
