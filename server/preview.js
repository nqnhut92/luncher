import { createHash } from 'node:crypto';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';
import { isRoomCode } from './room-codes.js';

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c]);
const requestOrigin = req => {
  const proto = req.headers['x-forwarded-proto']?.split(',')[0] || (req.socket?.encrypted ? 'https' : 'http');
  return `${proto}://${req.headers.host}`;
};
// 1200x630 is the large-card size for Teams, Slack, Zalo and Facebook; a square
// image is shrunk to a small thumbnail there and becomes hard to scan.
export const QR_WIDTH = 1200, QR_HEIGHT = 630;
export function qrCardPng(text) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const quiet = 4, scale = Math.floor(560 / (modules.size + quiet * 2));
  const box = (modules.size + quiet * 2) * scale;
  const left = Math.floor((QR_WIDTH - box) / 2), top = Math.floor((QR_HEIGHT - box) / 2);
  const png = new PNG({ width: QR_WIDTH, height: QR_HEIGHT });
  const paint = (x, y, [r, g, b]) => { const i = (y * QR_WIDTH + x) * 4; png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255; };
  for (let y = 0; y < QR_HEIGHT; y++) for (let x = 0; x < QR_WIDTH; x++) {
    const inBox = x >= left && x < left + box && y >= top && y < top + box;
    const mx = Math.floor((x - left) / scale) - quiet, my = Math.floor((y - top) / scale) - quiet;
    const dark = inBox && mx >= 0 && my >= 0 && mx < modules.size && my < modules.size && modules.get(my, mx);
    // Luncher cream background with an accent stripe; pure black on white keeps the code scannable.
    paint(x, y, dark ? [0, 0, 0] : inBox ? [255, 255, 255] : y < 10 ? [184, 77, 46] : [250, 247, 242]);
  }
  return PNG.sync.write(png);
}
// The version changes with the link so chat apps do not keep showing a stale QR.
export const qrVersion = grabUrl => createHash('sha256').update(grabUrl).digest('hex').slice(0, 10);

// Link-preview crawlers do not run JavaScript, so group meta tags are rendered on the server.
export function injectPreview(html, room, origin) {
  const url = `${origin}/g/${room.id}`;
  const description = room.grabUrl
    ? 'Quét mã QR để vào đơn nhóm Grab. Mở link để quay món trưa cùng nhóm.'
    : 'Vòng quay chọn món trưa của nhóm, không lặp món trong tuần.';
  const tags = [
    ['property', 'og:type', 'website'], ['property', 'og:url', url],
    ['property', 'og:title', `${room.name} · Luncher`], ['property', 'og:description', description],
    ...(room.grabUrl ? [
      ['property', 'og:image', `${origin}/api/qr?id=${room.id}&v=${qrVersion(room.grabUrl)}`],
      ['property', 'og:image:type', 'image/png'], ['property', 'og:image:width', String(QR_WIDTH)],
      ['property', 'og:image:height', String(QR_HEIGHT)], ['property', 'og:image:alt', `Mã QR đơn nhóm Grab của ${room.name}`],
      ['name', 'twitter:card', 'summary_large_image'],
    ] : []),
  ].map(([key, name, content]) => `<meta ${key}="${name}" content="${escapeHtml(content)}">`).join('');
  return html
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(description)}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(room.name)} · Luncher</title>`)
    .replace('</head>', `${tags}</head>`);
}

// Serves the SPA shell for /g/:id; the app still loads the group through /api/rooms.
export function createPageHandler(getStore, loadHtml) {
  return async function pageHandler(req, res) {
    const id = req.query?.id;
    let html = await loadHtml(req);
    try {
      const room = typeof id === 'string' && isRoomCode(id) ? await (await getStore()).get(id) : null;
      if (room) html = injectPreview(html, room, requestOrigin(req));
    } catch {
      // A missing preview must never stop the group page from opening.
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.statusCode = 200;
    res.end(html);
  };
}

export function createQrHandler(getStore) {
  return async function qrHandler(req, res) {
    res.setHeader('Referrer-Policy', 'no-referrer');
    const fail = (status, message) => {
      res.statusCode = status;
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(message);
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') return fail(405, 'Method not allowed');
    const id = req.query?.id;
    if (typeof id !== 'string' || !isRoomCode(id)) return fail(400, 'Invalid group');
    try {
      const room = await (await getStore()).get(id);
      if (!room?.grabUrl) return fail(404, 'No Grab link');
      const png = qrCardPng(room.grabUrl);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'image/png');
      // Versioned URLs can be cached briefly; the link itself may change at any time.
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.end(req.method === 'HEAD' ? undefined : png);
    } catch {
      return fail(503, 'Unavailable');
    }
  };
}
