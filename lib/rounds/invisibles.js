import { makeSubmissionRound } from './submission.js';

// Round 4 — Invisibles. Image prompt on the TV; teams type what they see. Host
// marks each free-text answer right/wrong.
export default makeSubmissionRound({ type: 'invisibles', grading: 'manual', pointsKey: 'invisible' });
