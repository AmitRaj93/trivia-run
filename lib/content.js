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
// Match `left`/`right` entries may each be plain text OR an image URL/path (auto-
// detected), so a Match question can use 6 images per side, or mix text + images.
// Text-round questions (jetsetters/invisibles) may add an optional bonus:
//   "bonus": { "q": "bonus question", "a": "bonus answer", "points": 5 }
// Teams get a second answer box; the host marks the bonus right/wrong for +points.
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DEFAULT_SCORING } from './protocol.js';
import { isImageUrl } from './media.js';

const here = dirname(fileURLToPath(import.meta.url));
const CONTENT_PATH = join(here, '..', 'content', 'quiz.json');

let cache = null;

// token -> real image URL/path. Images are served to clients only as opaque
// /img/<token> links so the real URL (which may name the answer, e.g.
// andrew_jackson.jpg) is never exposed and can't be followed back to the source.
const imageTokens = new Map();

function proxify(url) {
  if (!isImageUrl(url)) return url; // leave text / non-images alone
  if (url.startsWith('/img/')) return url; // already proxied
  const token = createHash('sha1').update(url).digest('hex').slice(0, 20);
  imageTokens.set(token, url);
  return `/img/${token}`;
}

export function resolveImageToken(token) {
  return imageTokens.get(token);
}

// Replace every image URL anywhere in the quiz with its opaque proxy path. Covers
// `image` / `answerImage` fields and Match `left`/`right` image entries.
function proxifyQuiz(node) {
  if (Array.isArray(node)) {
    return node.map((v) => (typeof v === 'string' ? proxify(v) : proxifyQuiz(v)));
  }
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if ((k === 'image' || k === 'answerImage') && typeof v === 'string') out[k] = proxify(v);
      else out[k] = proxifyQuiz(v);
    }
    return out;
  }
  return node;
}

export function loadQuiz() {
  if (cache) return cache;
  const raw = JSON.parse(readFileSync(CONTENT_PATH, 'utf8'));
  cache = {
    title: raw.title || 'Trivia Run',
    scoring: { ...DEFAULT_SCORING, ...(raw.scoring || {}) },
    rounds: proxifyQuiz(raw.rounds || []),
  };
  return cache;
}
