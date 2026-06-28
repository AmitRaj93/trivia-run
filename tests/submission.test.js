import { test } from 'node:test';
import assert from 'node:assert/strict';
import match from '../lib/rounds/match.js';
import jetsetters from '../lib/rounds/jetsetters.js';
import { fakeGame, scoreOf } from './helpers.js';

const MATCH_DEF = { questions: [{ prompt: 'pair up', left: ['1', '2', '3'], right: ['A', 'B', 'C'], answer: { 1: 'A', 2: 'B', 3: 'C' } }] };

test('match auto-grade: per-pair points plus all-correct bonus', () => {
  const game = fakeGame(['t1', 't2']);
  const rt = match.init();
  match.hostAction(rt, MATCH_DEF, 'openAnswers', {}, game);
  match.answer(rt, MATCH_DEF, game.teams.get('t1'), { value: { 1: 'A', 2: 'B', 3: 'C' } }, game);
  match.answer(rt, MATCH_DEF, game.teams.get('t2'), { value: { 1: 'A', 2: 'B', 3: 'X' } }, game);
  match.hostAction(rt, MATCH_DEF, 'autoGrade', {}, game);
  assert.equal(scoreOf(game, 't1'), 3 * 5 + 5); // perfect + bonus
  assert.equal(scoreOf(game, 't2'), 2 * 5); // 2 pairs, no bonus
});

test('match re-grade is reversible (no double counting)', () => {
  const game = fakeGame(['t1']);
  const rt = match.init();
  match.hostAction(rt, MATCH_DEF, 'openAnswers', {}, game);
  match.answer(rt, MATCH_DEF, game.teams.get('t1'), { value: { 1: 'A', 2: 'B', 3: 'C' } }, game);
  match.hostAction(rt, MATCH_DEF, 'autoGrade', {}, game);
  match.hostAction(rt, MATCH_DEF, 'autoGrade', {}, game);
  assert.equal(scoreOf(game, 't1'), 20);
});

test('answers ignored unless open', () => {
  const game = fakeGame(['t1']);
  const rt = match.init();
  assert.equal(match.answer(rt, MATCH_DEF, game.teams.get('t1'), { value: { 1: 'A' } }, game), false);
});

const JET_DEF = { questions: [{ q: 'capital of France?', a: 'Paris', bonus: { q: 'river?', a: 'Seine', points: 3 } }] };

test('manual grade toggles cleanly and bonus adds preset points', () => {
  const game = fakeGame(['t1']);
  const rt = jetsetters.init();
  jetsetters.hostAction(rt, JET_DEF, 'gradeTeam', { teamId: 't1', correct: true }, game);
  assert.equal(scoreOf(game, 't1'), 10);
  jetsetters.hostAction(rt, JET_DEF, 'gradeTeam', { teamId: 't1', correct: false }, game); // mis-mark undo
  assert.equal(scoreOf(game, 't1'), 0);
  jetsetters.hostAction(rt, JET_DEF, 'gradeTeam', { teamId: 't1', correct: true }, game);
  jetsetters.hostAction(rt, JET_DEF, 'gradeBonus', { teamId: 't1', correct: true }, game);
  assert.equal(scoreOf(game, 't1'), 13);
});
