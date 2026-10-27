import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { roomStore } from '../server/rooms.js';
import { createHandler } from '../server/handler.js';
import { normalizeGrabUrl } from '../server/grab.js';
import { createPageHandler, createQrHandler, qrVersion } from '../server/preview.js';
let db, store;
before(async () => {
  db = new PGlite();
  await db.exec(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  store = roomStore(async (text, params) => (await db.query(text, params)).rows);
});
after(async () => { await db.close(); });
const response = () => ({ headers: {}, setHeader(key, value) { this.headers[key] = value; },
  status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; },
  end(body) { this.body = body; this.code ??= this.statusCode; } });
async function request(body) {
  const res = response();
  await createHandler(() => store, () => new Date('2026-10-27T05:00:00Z'))({ method: 'POST', body, query: {},
    headers: { host: 'luncher.test', 'content-type': 'application/json' } }, res);
  return res;
}
const shell = '<!doctype html><html><head><meta name="description" content="x"><title>Luncher</title></head><body></body></html>';
async function page(id) {
  const res = response();
  await createPageHandler(() => store, async () => shell)({ method: 'GET', query: { id },
    headers: { host: 'luncher.test', 'x-forwarded-proto': 'https' } }, res);
  return res;
}

test('only https Grab links are accepted; empty clears the link', () => {
  assert.equal(normalizeGrabUrl('  https://r.grab.com/g/2-1-6-C7ABC  '), 'https://r.grab.com/g/2-1-6-C7ABC');
  assert.equal(normalizeGrabUrl('https://food.grab.com/vn/vi/group-order/abc'), 'https://food.grab.com/vn/vi/group-order/abc');
  assert.equal(normalizeGrabUrl('https://grab.onelink.me/2695613898?af_dp=x'), 'https://grab.onelink.me/2695613898?af_dp=x');
  assert.equal(normalizeGrabUrl('https://app.grab.com/s/u4Y8amwb'), 'https://app.grab.com/s/u4Y8amwb');
  assert.equal(normalizeGrabUrl(''), null);
  for (const bad of ['http://r.grab.com/x', 'https://grab.com.evil.io/x', 'https://evilgrab.com/x',
    'javascript:alert(1)', 'https://user:pw@grab.com/x', 'not a url', 'https://r.grab.com/' + 'a'.repeat(500), 42]) {
    assert.equal(normalizeGrabUrl(bad), false, String(bad));
  }
});

test('grab action is revision-checked, does not need today, and keeps meals', async () => {
  const id = await store.create('Hội Grab');
  await store.choose({ id, revision: 0, foodId: 'pho', today: '2026-10-27', replace: false, repeat: false });
  assert.equal((await request({ action: 'grab', id, revision: 1, grabUrl: 'https://evil.com/x' })).code, 400);
  const saved = await request({ action: 'grab', id, revision: 1, grabUrl: 'https://r.grab.com/g/abc' });
  assert.equal(saved.code, 200);
  assert.equal(saved.data.room.grabUrl, 'https://r.grab.com/g/abc');
  assert.equal(saved.data.room.history.length, 1);
  const stale = await request({ action: 'grab', id, revision: 1, grabUrl: '' });
  assert.equal(stale.code, 409);
  assert.equal(stale.data.room.grabUrl, 'https://r.grab.com/g/abc');
  const cleared = await request({ action: 'grab', id, revision: 2, grabUrl: '' });
  assert.equal(cleared.data.room.grabUrl, null);
});

test('shared group page carries escaped OG tags and a versioned QR image', async () => {
  const id = await store.create('Hội <b>"đói"</b>');
  const plain = await page(id);
  assert.equal(plain.headers['Content-Type'], 'text/html; charset=utf-8');
  assert.match(plain.body, /<title>Hội &lt;b&gt;&quot;đói&quot;&lt;\/b&gt; · Luncher<\/title>/);
  assert.doesNotMatch(plain.body, /og:image/);
  await store.setGrabUrl({ id, revision: 0, grabUrl: 'https://r.grab.com/g/abc' });
  const withQr = await page(id);
  assert.ok(withQr.body.includes(`<meta property="og:image" content="https://luncher.test/api/qr?id=${id}&amp;v=${qrVersion('https://r.grab.com/g/abc')}">`));
  assert.ok(withQr.body.includes(`<meta property="og:url" content="https://luncher.test/g/${id}">`));
  assert.equal((await page('nope')).body, shell, 'invalid codes still get the app shell');
  const broken = response();
  await createPageHandler(() => { throw new Error('db down'); }, async () => shell)({ query: { id }, headers: { host: 'x' } }, broken);
  assert.equal(broken.body, shell, 'database errors never block the page');
});

test('QR endpoint renders the room link as PNG and 404s without one', async () => {
  const id = await store.create('QR');
  const qr = async query => { const res = response(); await createQrHandler(() => store)({ method: 'GET', query, headers: {} }, res); return res; };
  assert.equal((await qr({ id })).statusCode, 404);
  assert.equal((await qr({ id: '../etc' })).statusCode, 400);
  await store.setGrabUrl({ id, revision: 0, grabUrl: 'https://r.grab.com/g/abc' });
  const ok = await qr({ id });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.headers['Content-Type'], 'image/png');
  assert.deepEqual([...ok.body.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
});
