import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, getRoom, serializeRooms, restoreRooms } from '../lib/game.js';

test('rooms get unique 4-letter codes', () => {
  const a = createRoom();
  const b = createRoom();
  assert.match(a.roomCode, /^[A-Z2-9]{4}$/);
  assert.notEqual(a.roomCode, b.roomCode);
  assert.equal(getRoom(a.roomCode.toLowerCase()), a); // lookup is case-insensitive
});

test('admission: pending request becomes a team with a token', () => {
  const g = createRoom();
  const reqId = g.addPending('Quizzlers', 'Sam');
  const { team } = g.approveTeam(reqId);
  assert.equal(team.name, 'Quizzlers');
  assert.ok(team.repToken);
  assert.equal(g.teams.size, 1);
  assert.deepEqual(g.teamOrder, [team.id]);
  assert.equal(g.approveTeam(reqId).error, 'Request no longer exists'); // can't double-approve
});

test('snapshot hides answers from non-hosts until reveal', () => {
  const g = createRoom();
  g.enterRound(0);
  assert.ok(g.snapshot('host').round.answer);
  assert.equal(g.snapshot('viewer').round.answer, null);
});

test('serialize/restore preserves teams and round position', () => {
  const g = createRoom();
  g.addPending('Reds');
  const reqId = [...g.pending.keys()][0];
  g.approveTeam(reqId);
  g.enterRound(0);
  const restored = restoreRooms(serializeRooms());
  const back = restored.find((r) => r.roomCode === g.roomCode);
  assert.equal(back.teams.size, 1);
  assert.equal(back.roundIndex, 0);
});
