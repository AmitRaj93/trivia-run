# Tests — guide for AI agents

This suite covers the **pure game logic** in `lib/` (round engines, scoring,
admission, snapshots, persistence). Those modules are the highest-value, most
bug-prone code and run without a browser or server. UI components and the
WebSocket transport are intentionally not unit-tested here.

## Run

```bash
npm test            # node --test tests/
```

No dependencies are needed — tests use Node's built-in runner (`node:test`) and
`node:assert/strict`. Requires Node 18+ (developed on 20). If `node` is not on
PATH, invoke a known binary directly, e.g. `node --test tests/`.

Run one file: `node --test tests/quads.test.js`. Run by name:
`node --test --test-name-pattern "pass timer"`.

## Layout

| File | Covers |
| ---- | ------ |
| `quads.test.js` | direct rotation, pass round-robin, scoring, pass timer, role-gated answers |
| `submission.test.js` | Match auto-grade + bonus, reversible re-grade, manual grading |
| `music.test.js` | buzzer lockout, score/penalty, host-only audio |
| `game.test.js` | room codes, admission, snapshot answer-hiding, serialize/restore |
| `media.test.js` | `isImageUrl` detection |
| `helpers.js` | `fakeGame()` — not a test file |

## Conventions

- Round modules are pure: `init/count/onSeek/hostAction/answer/publicState`
  take `(rt, def, …, game)`. Drive them with `fakeGame(teamIds, scoringOverrides)`
  from `helpers.js` rather than constructing a real `Game`.
- Use `game.teams.get(id)` and assert on `team.score`. Awards are reversible via
  per-question ledgers — assert that re-grading does **not** double-count.
- Reps must never see answers pre-reveal: assert
  `publicState(rt, def, 'rep', game).answer === null` while host gets a value.
- Keep tests deterministic: no timers, no sockets, no network.

## Adding a test

1. Put it in the matching `*.test.js` (or add a new file under `tests/`).
2. `import { test } from 'node:test'` and `assert from 'node:assert/strict'`.
3. Build state with `fakeGame`, exercise one host/rep action, assert score and
   status. Mirror existing tests for shape.
4. Run `npm test` — all green before committing.
