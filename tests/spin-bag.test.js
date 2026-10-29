import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSpinBag} from '../src/spin-bag.js';
const ids = Array.from({length: 12}, (_, i) => `shop-${i}`);
const draws = (bag, pool, n) => Array.from({length: n}, () => bag.draw(pool));
test('every option comes up once per round, in any random order', () => {
  for (const random of [() => 0, () => .99999, Math.random]) {
    const bag = createSpinBag(random);
    for (let round = 0; round < 3; round++) assert.deepEqual(new Set(draws(bag, ids, 12)).size, 12);
  }
});
test('a new round never starts with the previous pick', () => {
  for (let trial = 0; trial < 500; trial++) {
    const picks = draws(createSpinBag(), ids, 60);
    picks.forEach((id, i) => { if (i) assert.notEqual(id, picks[i - 1]); });
  }
});
test('picks are uniform over many rounds', () => {
  const bag = createSpinBag(), counts = Object.fromEntries(ids.map(id => [id, 0]));
  for (const id of draws(bag, ids, 12000)) counts[id]++;
  assert.ok(Object.values(counts).every(n => n === 1000), 'each option appears exactly once per round');
});
test('empty and single-option pools are handled', () => {
  const bag = createSpinBag();
  assert.equal(bag.draw([]), null);
  assert.deepEqual(draws(bag, ['only'], 3), ['only', 'only', 'only']);
});
test('a pool that changes between draws still avoids repeats within the new pool', () => {
  const bag = createSpinBag();
  const first = bag.draw(['a', 'b', 'c']);
  const rest = draws(bag, ['a', 'b', 'c', 'd'], 3);
  assert.equal(new Set([first, ...rest]).size, 4, 'the new option joins the round');
  assert.equal(bag.draw(['a', 'b']) !== null, true);
});
