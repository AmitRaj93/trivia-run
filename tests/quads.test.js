import { test } from 'node:test';
import assert from 'node:assert/strict';
import quads from '../lib/rounds/quads.js';
import { fakeGame, scoreOf } from './helpers.js';

const DEF = { type: 'quads', sets: [{ questions: [{ q: '1', a: 'a' }, { q: '2', a: 'b' }, { q: '3', a: 'c' }, { q: '4', a: 'd' }] }, { questions: [{ q: '5', a: 'e' }, { q: '6', a: 'f' }] }] };

function setup(teamIds = ['t1', 't2', 't3', 't4']) {
  const game = fakeGame(teamIds);
  game.module = quads;
  const rt = quads.init(DEF, game);
  game.rt = rt;
  return { game, rt };
}

test('count flattens all sets', () => {
  assert.equal(quads.count(DEF), 6);
});

test('direct rotates by position within the set', () => {
  const { game, rt } = setup();
  assert.equal(rt.directTeamId, 't1');
  rt.qIndex = 2;
  quads.onSeek(rt, DEF, game);
  assert.equal(rt.directTeamId, 't3');
  rt.qIndex = 4; // first question of set 2 restarts rotation
  quads.onSeek(rt, DEF, game);
  assert.equal(rt.directTeamId, 't1');
});

test('correct direct awards direct points and finishes', () => {
  const { game, rt } = setup();
  quads.hostAction(rt, DEF, 'quadsMarkDirect', { correct: true }, game);
  assert.equal(scoreOf(game, 't1'), 10);
  assert.equal(rt.status, 'done');
});

test('missed direct passes round-robin from the next team; first correct scores pass points', () => {
  const { game, rt } = setup();
  quads.hostAction(rt, DEF, 'quadsMarkDirect', { correct: false }, game);
  assert.equal(rt.status, 'passing');
  assert.deepEqual(rt.passQueue, ['t2', 't3', 't4']);
  quads.hostAction(rt, DEF, 'quadsMarkPass', { correct: false }, game); // t2 misses
  quads.hostAction(rt, DEF, 'quadsMarkPass', { correct: true }, game); // t3 gets it
  assert.equal(scoreOf(game, 't3'), 5);
  assert.equal(rt.status, 'done');
});

test('exhausted pass scores nobody', () => {
  const { game, rt } = setup();
  quads.hostAction(rt, DEF, 'quadsMarkDirect', { correct: false }, game);
  for (let i = 0; i < 3; i++) quads.hostAction(rt, DEF, 'quadsMarkPass', { correct: false }, game);
  assert.equal(rt.status, 'done');
  for (const id of ['t1', 't2', 't3', 't4']) assert.equal(scoreOf(game, id), 0);
});

test('pass timer is half the direct timer', () => {
  const { game, rt } = setup();
  quads.hostAction(rt, DEF, 'quadsSetDirect', { teamId: 't1' }, game);
  game.startTimer(60); // host arms the direct timer
  quads.hostAction(rt, DEF, 'quadsMarkDirect', { correct: false }, game);
  assert.equal(game.timer.durationSec, 30);
});

test('host snapshot exposes the answer, players never do before reveal', () => {
  const { game, rt } = setup();
  assert.equal(quads.publicState(rt, DEF, 'host', game).answer, 'a');
  assert.equal(quads.publicState(rt, DEF, 'rep', game).answer, null);
});
