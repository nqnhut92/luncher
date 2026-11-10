import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractGrabUrl } from '../src/share-target.js';
import { buildManifest, createManifestHandler } from '../server/manifest.js';

test('extractGrabUrl handles Vietnamese text and extracts the link', () => {
  const text = 'Join the Group Order from Cơm Gà Xối Mỡ 142 - Lê Văn Duyệt! Add your favourites and enjoy a feast together! https://app.grab.com/s/qn4WHlnn';
  assert.equal(extractGrabUrl({ text }), 'https://app.grab.com/s/qn4WHlnn');
});

test('extractGrabUrl extracts from url-only and title-only inputs', () => {
  assert.equal(extractGrabUrl({ url: 'https://app.grab.com/s/qn4WHlnn' }), 'https://app.grab.com/s/qn4WHlnn');
  assert.equal(extractGrabUrl({ title: 'https://app.grab.com/s/qn4WHlnn' }), 'https://app.grab.com/s/qn4WHlnn');
});

test('extractGrabUrl strips trailing punctuation', () => {
  assert.equal(extractGrabUrl({ text: 'https://app.grab.com/s/qn4WHlnn.,!?)]}"\'' }), 'https://app.grab.com/s/qn4WHlnn');
  assert.equal(extractGrabUrl({ text: 'Đơn nhóm: (https://app.grab.com/s/qn4WHlnn)...' }), 'https://app.grab.com/s/qn4WHlnn');
  assert.equal(extractGrabUrl({ text: 'Xem link "https://app.grab.com/s/qn4WHlnn", rồi đặt nhé!' }), 'https://app.grab.com/s/qn4WHlnn');
});

test('extractGrabUrl rejects non-Grab links, http, credentials, and overly long URLs', () => {
  assert.equal(extractGrabUrl({ text: 'https://evil.com/fake' }), null);
  assert.equal(extractGrabUrl({ text: 'http://app.grab.com/s/qn4WHlnn' }), null);
  assert.equal(extractGrabUrl({ text: 'https://user:pass@app.grab.com/s/qn4WHlnn' }), null);
  assert.equal(extractGrabUrl({ text: 'https://app.grab.com/s/' + 'a'.repeat(500) }), null);
  assert.equal(extractGrabUrl({}), null);
  assert.equal(extractGrabUrl(null), null);
  assert.equal(extractGrabUrl({ url: null, text: undefined, title: '' }), null);
});

test('extractGrabUrl prioritizes first valid Grab link across fields and text', () => {
  // Multiple links in text: first valid Grab link is chosen
  const multiple = 'Check https://notgrab.com/fake and https://app.grab.com/s/first and https://app.grab.com/s/second';
  assert.equal(extractGrabUrl({ text: multiple }), 'https://app.grab.com/s/first');

  // Search order: url -> text -> title
  assert.equal(extractGrabUrl({
    url: 'https://app.grab.com/s/from-url',
    text: 'https://app.grab.com/s/from-text',
    title: 'https://app.grab.com/s/from-title',
  }), 'https://app.grab.com/s/from-url');

  assert.equal(extractGrabUrl({
    url: 'https://notgrab.com/invalid',
    text: 'https://app.grab.com/s/from-text',
    title: 'https://app.grab.com/s/from-title',
  }), 'https://app.grab.com/s/from-text');

  assert.equal(extractGrabUrl({
    url: 'https://notgrab.com/invalid',
    text: 'không có link ở đây',
    title: 'https://app.grab.com/s/from-title',
  }), 'https://app.grab.com/s/from-title');
});

test('buildManifest produces valid PWA manifest and share_target shape', () => {
  const code = 'Ab3xY9';
  const manifest = buildManifest(code, 'Hội ăn trưa tầng 3');
  assert.equal(manifest.id, '/g/Ab3xY9');
  assert.equal(manifest.start_url, '/g/Ab3xY9');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.name, 'Luncher · Hội ăn trưa tầng 3');
  assert.equal(manifest.short_name, 'Hội ăn trưa tầng 3');
  assert.equal(manifest.lang, 'vi');
  assert.equal(manifest.theme_color, '#faf7f2');
  assert.equal(manifest.background_color, '#f6f1ea');
  assert.deepEqual(manifest.share_target, {
    action: '/g/Ab3xY9',
    method: 'GET',
    params: {
      title: 'share_title',
      text: 'share_text',
      url: 'share_url',
    },
  });
  assert.deepEqual(manifest.icons, [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ]);
});

test('buildManifest falls back to generic name when room name is missing or long', () => {
  const fallback = buildManifest('Ab3xY9', null);
  assert.equal(fallback.name, 'Luncher');
  assert.equal(fallback.short_name, 'Luncher');

  const longName = 'A'.repeat(80);
  const trimmed = buildManifest('Ab3xY9', longName);
  assert.equal(trimmed.name, 'Luncher · ' + 'A'.repeat(45));
  assert.equal(trimmed.short_name, 'A'.repeat(20));
});

const mockResponse = () => ({
  headers: {},
  setHeader(k, v) { this.headers[k] = v; },
  end(body) { this.body = body; this.code ??= this.statusCode; },
});

test('manifest handler responds 200 with manifest JSON for valid code', async () => {
  const mockStore = {
    get: async code => (code === 'Ab3xY9' ? { id: code, name: 'Nhóm Thử Nghiệm' } : null),
  };
  const handler = createManifestHandler(() => mockStore);
  const res = mockResponse();

  await handler({ method: 'GET', query: { id: 'Ab3xY9' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'application/manifest+json; charset=utf-8');
  assert.equal(res.headers['Cache-Control'], 'public, max-age=300');
  const parsed = JSON.parse(res.body);
  assert.equal(parsed.id, '/g/Ab3xY9');
  assert.equal(parsed.name, 'Luncher · Nhóm Thử Nghiệm');
  assert.equal(parsed.share_target.action, '/g/Ab3xY9');
});

test('manifest handler returns 404 for invalid code format', async () => {
  const handler = createManifestHandler(() => ({ get: async () => null }));
  for (const bad of ['invalid', '123', 'A'.repeat(7), '../etc', '', undefined]) {
    const res = mockResponse();
    await handler({ method: 'GET', query: { id: bad } }, res);
    assert.equal(res.statusCode, 404, String(bad));
  }
});

test('manifest handler falls back to generic name when room lookup fails or throws', async () => {
  const throwingStore = {
    get: async () => { throw new Error('Database connection failed'); },
  };
  const handler = createManifestHandler(() => throwingStore);
  const res = mockResponse();

  await handler({ method: 'GET', query: { id: 'Ab3xY9' } }, res);
  assert.equal(res.statusCode, 200);
  const parsed = JSON.parse(res.body);
  assert.equal(parsed.name, 'Luncher');
  assert.equal(parsed.short_name, 'Luncher');
  assert.equal(parsed.id, '/g/Ab3xY9');
});

test('manifest handler supports HEAD and rejects unsupported methods with 405', async () => {
  const handler = createManifestHandler(() => ({ get: async () => ({ name: 'Test' }) }));
  const headRes = mockResponse();
  await handler({ method: 'HEAD', query: { id: 'Ab3xY9' } }, headRes);
  assert.equal(headRes.statusCode, 200);
  assert.equal(headRes.body, undefined);

  const postRes = mockResponse();
  await handler({ method: 'POST', query: { id: 'Ab3xY9' } }, postRes);
  assert.equal(postRes.statusCode, 405);
});
