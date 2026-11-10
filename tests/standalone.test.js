import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isStandaloneApp, watchStandaloneApp } from '../src/standalone.js';

test('isStandaloneApp detects browser tabs vs standalone PWAs and iOS home screen apps', () => {
  assert.equal(isStandaloneApp(null), false);
  assert.equal(isStandaloneApp({}), false);
  assert.equal(
    isStandaloneApp({
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: false },
    }),
    false
  );
  assert.equal(
    isStandaloneApp({
      matchMedia: query => ({ matches: query === '(display-mode: standalone)' }),
      navigator: {},
    }),
    true
  );
  assert.equal(
    isStandaloneApp({
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: true },
    }),
    true
  );
});

test('watchStandaloneApp notifies listeners on display-mode changes and cleans up', () => {
  let listener = null;
  let matches = false;
  const fakeWindow = {
    matchMedia: query => ({
      matches: query === '(display-mode: standalone)' && matches,
      addEventListener: (event, fn) => {
        if (event === 'change') listener = fn;
      },
      removeEventListener: (event, fn) => {
        if (event === 'change' && listener === fn) listener = null;
      },
    }),
    navigator: {},
  };

  const updates = [];
  const stop = watchStandaloneApp(value => updates.push(value), fakeWindow);
  assert.equal(typeof listener, 'function');

  matches = true;
  listener();
  matches = false;
  listener();
  assert.deepEqual(updates, [true, false]);

  stop();
  assert.equal(listener, null);
});
