import { makeSubmissionRound } from './submission.js';

// Round 3 — Jet Setters. All teams type a free-text answer; the host marks each
// submission right/wrong (free text can't be auto-graded reliably).
export default makeSubmissionRound({ type: 'jetsetters', grading: 'manual', pointsKey: 'jetSetter' });
