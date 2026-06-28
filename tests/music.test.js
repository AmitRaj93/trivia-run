import { test } from 'node:test';
import assert from 'node:assert/strict';
import music from '../lib/rounds/music.js';
import { fakeGame, scoreOf } from './helpers.js';

const DEF = { questions: [{ q: 'name the tune', a: 'Song' }] };

test('first buzz wins and locks the rest out', () => {
  const game = fakeGame(['t1', 't2']);
  const rt = music.init();
  music.hostAction(rt, DEF, 'armBuzzer', {}, game);
  assert.equal(music.answer(rt, DEF, game.teams.get('t1')), true);
  assert.equal(rt.winnerId, 't1');
  assert.equal(music.answer(rt, DEF, game.teams.get('t2')), false); // locked
});

test('correct buzz scores; wrong buzz penalises and locks out', () => {
  const game = fakeGame(['t1', 't2'], { musicPenalty: 2 });
  const rt = music.init();
  music.hostAction(rt, DEF, 'armBuzzer', {}, game);
  music.answer(rt, DEF, game.teams.get('t1'));
  music.hostAction(rt, DEF, 'markBuzz', { correct: false }, game);
  assert.equal(scoreOf(game, 't1'), -2);
  assert.ok(rt.lockedOut.includes('t1'));
  music.hostAction(rt, DEF, 'armBuzzer', {}, game);
  music.answer(rt, DEF, game.teams.get('t2'));
  music.hostAction(rt, DEF, 'markBuzz', { correct: true }, game);
  assert.equal(scoreOf(game, 't2'), 10);
});

test('audio is host/tv only', () => {
  const game = fakeGame(['t1']);
  const rt = music.init();
  const withAudio = { questions: [{ q: 'x', a: 'y', audio: '/m.mp3' }] };
  assert.equal(music.publicState(rt, withAudio, 'host', game).audio, '/m.mp3');
  assert.equal(music.publicState(rt, withAudio, 'rep', game).audio, null);
});
