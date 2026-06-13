// Round-engine registry + shared navigation. Each round module implements:
//   init(def, game) -> rt
//   count(def) -> number of questions
//   onSeek(rt, def, game)            // reset per-question state after qIndex moves
//   hostAction(rt, def, action, payload, game) -> boolean (mutated?)
//   answer(rt, def, team, payload, game) -> boolean (mutated?)
//   publicState(rt, def, role, game) -> snapshot object (role-aware)

import quads from './quads.js';
import match from './match.js';
import jetsetters from './jetsetters.js';
import invisibles from './invisibles.js';
import music from './music.js';
import { makePlaceholder } from './placeholder.js';

const registry = {
  quads,
  match,
  jetsetters,
  invisibles,
  music,
};

export function getRoundModule(type) {
  return registry[type] || makePlaceholder(type || 'unknown');
}
