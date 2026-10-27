import { chromium } from 'playwright';
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { startDevServer } from './dev.js';
import { roomStore } from '../server/rooms.js';
import { createHandler } from '../server/handler.js';

// Real app + real SQL queries against isolated embedded Postgres. No Neon secrets.
const db = new PGlite();
await db.exec(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
const store = roomStore(async (sql, params) => (await db.query(sql, params)).rows);
const app = await startDevServer(createHandler(() => store), 0);
const origin = `http://127.0.0.1:${app.server.address().port}`;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
let browser;
try {
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  const a = await browser.newContext({ reducedMotion: 'reduce' });
  const b = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  const first = await a.newPage(), second = await b.newPage();
  const errors = [];
  for (const page of [first, second]) page.on('pageerror', error => errors.push(error.message));
  await first.goto(origin);
  // Personal confirmation remains independent of shared-room data.
  await first.locator('#spin').click(); await first.locator('#confirm').click();
  assert.equal(await first.locator('.week-row').count(), 1);
  await first.locator('#group-name').fill('Hội đói <b>tầng 3</b>');
  await first.locator('#create-group button').click();
  await first.waitForURL('**/g/**');
  await first.waitForFunction(() => !document.querySelector('#spin').disabled);
  const roomUrl = first.url();
  const code = new URL(roomUrl).pathname.split('/')[2];
  assert.match(code, /^[A-Za-z0-9]{6}$/);

  assert.ok(await first.locator('.group-bar h2').innerText() === 'Hội đói <b>tầng 3</b>');
  assert.equal(await first.locator('.group-bar h2 b').count(), 0, 'room name is escaped');
  assert.equal(await first.locator('.week-row').count(), 0, 'personal history not copied into group');
  await second.goto(roomUrl);
  await second.waitForFunction(() => !document.querySelector('#spin').disabled);
  // Member B keeps a stale revision and a rolled suggestion while A confirms.
  await second.locator('#spin').click(); await second.locator('#confirm').waitFor();
  await first.locator('#spin').click(); await first.locator('#confirm').click();
  await first.locator('#undo').waitFor();
  const picked = await first.locator('.result h2').innerText();
  await second.locator('#confirm').click();
  await second.locator('.notice').waitFor();
  assert.equal(await second.locator('.result h2').innerText(), picked, 'conflict shows winner');
  assert.equal(await second.locator('.week-row').count(), 1);
  assert.ok(!(await second.locator('.wheel-label b').allTextContents()).includes(picked));
  // Any member may explicitly replace and undo the shared choice.
  await second.locator('#spin').click();
  assert.match(await second.locator('#confirm').innerText(), /Đổi món/);
  await second.locator('#confirm').click(); await second.locator('#undo').waitFor();
  const replacement = await second.locator('.result h2').innerText();
  await first.locator('#refresh-group').click();
  await first.waitForFunction(name => document.querySelector('.result h2')?.textContent === name, replacement);
  await second.reload(); await second.locator('#undo').waitFor();
  assert.equal(await second.locator('.result h2').innerText(), replacement);
  assert.equal(await second.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await second.locator('#theme').click();
  const theme = await second.locator('html').getAttribute('data-theme');
  await second.reload(); await second.locator('#undo').waitFor();
  assert.equal(await second.locator('html').getAttribute('data-theme'), theme);
  await second.locator('#edit-name').click();
  await second.locator('#rename-name').fill('Hội ăn trưa mới');
  await second.locator('#cancel-rename').click();
  assert.equal(await second.locator('.group-bar h2').innerText(), 'Hội đói <b>tầng 3</b>');
  await second.locator('#edit-name').click();
  await second.locator('#rename-name').fill('Hội ăn trưa mới');
  await second.locator('#rename-group .small-primary').click();
  await second.waitForFunction(() => document.querySelector('.group-bar h2')?.textContent === 'Hội ăn trưa mới');
  await first.locator('#refresh-group').click();
  await first.waitForFunction(() => document.querySelector('.group-bar h2')?.textContent === 'Hội ăn trưa mới');
  assert.equal(second.url(), roomUrl);
  assert.equal(await second.locator('.result h2').innerText(), replacement);
  const headings = await second.locator('.side-card .eyebrow').allTextContents();
  assert.ok(headings.every(text => !/^0[12] \//.test(text)));
  await second.screenshot({ path: '/tmp/luncher-group-mobile.png', fullPage: true });
  await first.screenshot({ path: '/tmp/luncher-group-desktop.png', fullPage: true });
  await second.locator('#undo').click();
  await second.waitForFunction(() => document.querySelectorAll('.week-row').length === 0);
  await first.goto(origin); assert.equal(await first.locator('.week-row').count(), 1);
  // Invalid links must never fall back to editable personal mode.
  await second.goto(origin + '/g/no-such-room'); await second.locator('.notice').waitFor();
  assert.equal(await second.locator('#spin').isDisabled(), true);
  assert.equal(await second.locator('#refresh-group').isEnabled(), true);
  await second.locator('#refresh-group').click(); await second.locator('.notice').waitFor();
  // Offline group failure: keep group context, leave personal data untouched.
  await second.route('**/api/rooms*', route => route.abort());
  await second.goto(roomUrl); await second.locator('.notice').waitFor();
  assert.equal(await second.locator('#spin').isDisabled(), true);
  assert.deepEqual(errors, []);
  console.log('PASS: personal mode, short codes, rename/cancel, create/share/deep link, escaped group name, two independent members, conflict, replacement, refresh, reload persistence, undo, mobile, theme and failed/offline room handling.');
} finally {
  await browser?.close();
  await app.close();
  await db.close();
}
