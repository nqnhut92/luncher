import test from 'node:test';
import assert from 'node:assert/strict';
import { linkVersion } from '../src/groups.js';

test('copied group links get a short base-36 version token', () => {
  for (let i = 0; i < 200; i++) assert.match(linkVersion(), /^[0-9a-z]{4}$/);
});

test('link version maps random bytes onto base-36 digits', () => {
  const fixed = bytes => { bytes.set([0, 35, 36, 255]); return bytes; };
  assert.equal(linkVersion(4, fixed), '0z03');
});
