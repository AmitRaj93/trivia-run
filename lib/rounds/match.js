import { makeSubmissionRound } from './submission.js';

// Round 2 — Match the Following. Six numbered items (1–6) to six lettered options
// (A–F). Teams submit a number→letter map; auto-graded per correct pair.
export default makeSubmissionRound({ type: 'match', grading: 'auto', pointsKey: 'matchPair' });
