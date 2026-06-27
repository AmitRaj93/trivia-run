import { makeSubmissionRound } from './submission.js';

// Emoji round — the prompt is a string of emoji; all teams type what they think
// it spells out. Host marks each free-text answer right/wrong (same engine as Jet
// Setters, just a different scoring key and a big-emoji presentation client-side).
export default makeSubmissionRound({ type: 'emoji', grading: 'manual', pointsKey: 'emoji' });
