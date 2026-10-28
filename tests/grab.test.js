import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { roomStore } from '../server/rooms.js';
import { createHandler } from '../server/handler.js';
import { grabImageUrl, normalizeGrabUrl, parseGrabMeta, scanGrabLink } from '../server/grab.js';
import { PNG } from 'pngjs';
import { createPageHandler, createQrHandler, previewText, qrVersion } from '../server/preview.js';
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
// Synthetic stand-in for Grab's share page; tests never reach the network.
const scanned = { title: 'Đặt đơn nhóm GrabFood', image: 'https://food-cms.grab.com/group_order/share_img/demo.jpg' };
async function request(body, scan = async () => scanned) {
  const res = response();
  await createHandler(() => store, () => new Date('2026-10-27T05:00:00Z'), scan)({ method: 'POST', body, query: {},
    headers: { host: 'luncher.test', 'content-type': 'application/json' } }, res);
  return res;
}
const shell = '<!doctype html><html><head><meta name="description" content="x"><title>Luncher</title></head><body></body></html>';
async function page(id) {
  const res = response();
  await createPageHandler(() => store, async () => shell, () => new Date('2026-10-27T05:00:00Z'))({ method: 'GET', query: { id },
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
  assert.equal(saved.data.room.grabTitle, scanned.title);
  assert.equal(saved.data.room.grabImage, scanned.image);
  assert.equal(saved.data.room.history.length, 1);
  const stale = await request({ action: 'grab', id, revision: 1, grabUrl: '' });
  assert.equal(stale.code, 409);
  assert.equal(stale.data.room.grabUrl, 'https://r.grab.com/g/abc');
  const cleared = await request({ action: 'grab', id, revision: 2, grabUrl: '' });
  assert.equal(cleared.data.room.grabUrl, null);
  assert.equal(cleared.data.room.grabImage, null, 'clearing the link drops scanned details');
  const unscanned = await request({ action: 'grab', id, revision: 3, grabUrl: 'https://r.grab.com/g/abc' },
    async () => { throw new Error('Grab timed out'); });
  assert.equal(unscanned.code, 200, 'a failed scan still saves the link');
  assert.equal(unscanned.data.room.grabImage, null);
});

const shareHtml = `<html><head><meta property="og:title" content="M&#236; Qu&#7843;ng &amp; b&#225;nh">
<meta property="og:image" content="https://food-cms.grab.com/group_order/share_img/demo.jpg"><title>x</title></head></html>`;
const htmlResponse = (body, init = {}) => new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, ...init });

test('Grab share pages yield a title and a Grab-hosted image only', () => {
  assert.deepEqual(parseGrabMeta(shareHtml), { title: 'Mì Quảng & bánh', image: 'https://food-cms.grab.com/group_order/share_img/demo.jpg' });
  assert.deepEqual(parseGrabMeta('<meta property="og:image" content="https://evil.example/x.png"><meta property="og:title" content="A\nB">'), { title: 'A B', image: null });
  assert.equal(parseGrabMeta('<p>nothing</p>'), null);
  for (const bad of ['http://food-cms.grab.com/x.png', 'https://grab.com.evil.io/x.png', 'https://u:p@food-cms.grab.com/x', 'nope']) {
    assert.equal(grabImageUrl(bad), null, bad);
  }
});

test('the scanner follows Grab redirects only and caps the page size', async () => {
  const seen = [];
  const fetchImpl = async url => {
    seen.push(url);
    if (url.endsWith('/s/one')) return new Response(null, { status: 302, headers: { location: 'https://food.grab.com/share' } });
    if (url.endsWith('/s/deep')) return new Response(null, { status: 302, headers: { location: `https://app.grab.com/open?groupID=demo&og_title=%C4%90%E1%BA%B7t+%C4%91%C6%A1n+nh%C3%B3m&og_image=${encodeURIComponent(scanned.image)}&pad=${'x'.repeat(600)}` } });
    if (url.endsWith('/s/away')) return new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest' } });
    if (url.endsWith('/s/huge')) return htmlResponse('x'.repeat(300 * 1024));
    if (url.endsWith('/s/json')) return htmlResponse('{}', { headers: { 'content-type': 'application/json' } });
    return htmlResponse(shareHtml);
  };
  assert.equal((await scanGrabLink('https://app.grab.com/s/one', { fetchImpl })).title, 'Mì Quảng & bánh');
  assert.deepEqual(seen, ['https://app.grab.com/s/one', 'https://food.grab.com/share']);
  assert.deepEqual(await scanGrabLink('https://app.grab.com/s/deep', { fetchImpl }), { title: 'Đặt đơn nhóm', image: scanned.image },
    'long deep-link redirects carry the share details without another request');
  assert.equal(seen.some(url => url.includes('/open?')), false);
  assert.equal(await scanGrabLink('https://app.grab.com/s/away', { fetchImpl }), null);
  assert.equal(seen.includes('http://169.254.169.254/latest'), false, 'non-Grab redirects are never requested');
  await assert.rejects(scanGrabLink('https://app.grab.com/s/huge', { fetchImpl }));
  assert.equal(await scanGrabLink('https://app.grab.com/s/json', { fetchImpl }), null);
});

test('preview text leads with today\'s confirmed dish', () => {
  const room = { name: 'Hội A', grabUrl: 'https://r.grab.com/g/abc', grabTitle: 'Đặt đơn nhóm GrabFood',
    history: [{ foodId: 'pho', date: '2026-10-26' }, { foodId: 'mi-quang', date: '2026-10-27' }],
    events: [{ date: '2026-10-27', action: 'confirm', occurredAt: '2026-10-27T04:05:00.000Z' }] };
  assert.deepEqual(previewText(room, '2026-10-27'), { title: 'Hôm nay ăn Mì Quảng 🍜 · Hội A',
    description: 'Hôm nay nhóm chốt 🍜 Mì Quảng lúc 11:05. Đặt đơn nhóm GrabFood: quét mã QR để thêm món.' });
  assert.deepEqual(previewText({ ...room, grabUrl: null }, '2026-10-28'), { title: 'Hội A · Luncher',
    description: 'Hôm nay nhóm chưa chốt món. Mở link để quay món trưa cùng nhóm.' });
});

test('shared group page carries escaped OG tags and a versioned QR image', async () => {
  const id = await store.create('Hội <b>"đói"</b>');
  const plain = await page(id);
  assert.equal(plain.headers['Content-Type'], 'text/html; charset=utf-8');
  assert.match(plain.body, /<title>Hội &lt;b&gt;&quot;đói&quot;&lt;\/b&gt; · Luncher<\/title>/);
  assert.doesNotMatch(plain.body, /og:image/);
  await store.choose({ id, revision: 0, foodId: 'pho', today: '2026-10-27', replace: false, repeat: false });
  await store.setGrabUrl({ id, revision: 1, grabUrl: 'https://r.grab.com/g/abc' });
  const withQr = await page(id);
  assert.match(withQr.body, /<meta property="og:title" content="Hôm nay ăn [^"]+ · Hội &lt;b&gt;/);
  assert.ok(withQr.body.includes(`<meta property="og:image" content="https://luncher.test/api/qr?id=${id}&amp;v=${qrVersion('https://r.grab.com/g/abc')}">`));
  assert.ok(withQr.body.includes(`<meta property="og:url" content="https://luncher.test/g/${id}">`));
  assert.equal((await page('nope')).body, shell, 'invalid codes still get the app shell');
  const broken = response();
  await createPageHandler(() => { throw new Error('db down'); }, async () => shell)({ query: { id }, headers: { host: 'x' } }, broken);
  assert.equal(broken.body, shell, 'database errors never block the page');
});

test('QR endpoint renders the room link as PNG and 404s without one', async () => {
  const id = await store.create('QR');
  const art = new PNG({ width: 60, height: 45 });
  art.data.fill(200);
  for (let i = 3; i < art.data.length; i += 4) art.data[i] = 255;
  const loaded = [];
  const qr = async query => { const res = response(); await createQrHandler(() => store, async url => { loaded.push(url); return art; })({ method: 'GET', query, headers: {} }, res); return res; };
  assert.equal((await qr({ id })).statusCode, 404);
  assert.equal((await qr({ id: '../etc' })).statusCode, 400);
  await store.setGrabUrl({ id, revision: 0, grabUrl: 'https://r.grab.com/g/abc' });
  const ok = await qr({ id });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.headers['Content-Type'], 'image/png');
  assert.deepEqual([...ok.body.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  assert.equal(loaded.length, 0, 'no art is fetched for links without a scanned image');
  await store.setGrabUrl({ id, revision: 1, grabUrl: 'https://r.grab.com/g/abc', grabImage: scanned.image });
  const card = PNG.sync.read((await qr({ id })).body);
  assert.deepEqual([card.width, card.height, loaded], [1200, 630, [scanned.image]]);
  const pixel = (x, y) => [...card.data.subarray((y * 1200 + x) * 4, (y * 1200 + x) * 4 + 3)];
  assert.deepEqual(pixel(300, 315), [200, 200, 200], 'Grab art fills the left side');
  const square = PNG.sync.read((await qr({ id, layout: 'square' })).body);
  assert.deepEqual([square.width, square.height, loaded.length], [480, 480, 1]);
});
