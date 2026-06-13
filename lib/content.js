// Loads the quiz definition from content/quiz.json (server-side only). The shape:
//
// {
//   "title": "...",
//   "scoring": { ...optional overrides of DEFAULT_SCORING... },
//   "rounds": [
//     { "type": "quads", "title": "...", "sets": [ { "questions": [ {q,a,media?} x12 ] } x3 ] },
//     { "type": "match", "title": "...", "questions": [ { prompt, left[6], right[6], answer{} } ] },
//     { "type": "jetsetters", "title": "...", "questions": [ { q, a } ] },
//     { "type": "invisibles", "title": "...", "questions": [ { image, a } ] },
//     { "type": "music", "title": "...", "questions": [ { audio, q, a } ] }
//   ]
// }
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DEFAULT_SCORING } from './protocol.js';

const here = dirname(fileURLToPath(import.meta.url));
const CONTENT_PATH = join(here, '..', 'content', 'quiz.json');

let cache = null;

export function loadQuiz() {
  if (cache) return cache;
  const raw = JSON.parse(readFileSync(CONTENT_PATH, 'utf8'));
  cache = {
    title: raw.title || 'Trivia Run',
    scoring: { ...DEFAULT_SCORING, ...(raw.scoring || {}) },
    rounds: raw.rounds || [],
  };
  return cache;
}
