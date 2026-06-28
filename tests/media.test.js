import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isImageUrl } from '../lib/media.js';

test('detects image URLs and paths', () => {
  assert.equal(isImageUrl('https://x/a.png'), true);
  assert.equal(isImageUrl('/media/a.jpg'), true);
  assert.equal(isImageUrl('photo.webp'), true);
});

test('plain text and audio are not images', () => {
  assert.equal(isImageUrl('Tokyo'), false);
  assert.equal(isImageUrl('/media/clip.mp3'), false);
  assert.equal(isImageUrl(null), false);
});
