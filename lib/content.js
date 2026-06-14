// Loads the quiz definition from content/quiz.json (server-side only). The shape:
//
// {
//   "title": "...",
//   "scoring": { ...optional overrides of DEFAULT_SCORING... },
//   "rounds": [
//     { "type": "quads", "title": "...", "subtitle"?: "...", "sets": [ { "questions": [ {q,a} x12 ] } x3 ] },
//     { "type": "match", "title": "...", "subtitle"?, "questions": [ { prompt, left[6], right[6], answer{} } ] },
//     { "type": "jetsetters", "title": "...", "subtitle"?, "questions": [ { q, a, image? } ] },
//     { "type": "invisibles", "title": "...", "subtitle"?, "questions": [ { image, a } ] },
//     { "type": "music", "title": "...", "subtitle"?, "questions": [ { audio, q, a } ] }
//   ]
// }
//
// Any question may add:
//   "image":       shown with the QUESTION (e.g. Jet Setters / Invisibles prompt).
//   "answerImage": shown with the ANSWER, only after the host presses Reveal.
// "subtitle" on a round is shown on its title card.
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
