import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';
import { isRoomCode } from './room-codes.js';
import { roomToday } from './calendar.js';

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
const CREAM = [250, 247, 242];

// QR only: chat apps crop wide cards to a centred thumbnail, so anything drawn
// beside the code (such as Grab's store art) pushes the QR out of view.
export function qrCardPng(text, { width = QR_WIDTH, height = QR_HEIGHT } = {}) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const quiet = 4;
  const scale = Math.floor((Math.min(width, height) - 70) / (modules.size + quiet * 2));
  const box = (modules.size + quiet * 2) * scale;
  const left = Math.floor((width - box) / 2), top = Math.floor((height - box) / 2);
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const inBox = x >= left && x < left + box && y >= top && y < top + box;
    const mx = Math.floor((x - left) / scale) - quiet, my = Math.floor((y - top) / scale) - quiet;
    const dark = inBox && mx >= 0 && my >= 0 && mx < modules.size && my < modules.size && modules.get(my, mx);
    // Plain cream background; pure black on white keeps the code scannable.
    const [r, g, b] = dark ? [0, 0, 0] : inBox ? [255, 255, 255] : CREAM, i = (y * width + x) * 4;
    png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
}

// The image version changes with the saved link; chat services may still cache previews.
export const qrVersion = grabUrl => createHash('sha256').update(grabUrl).digest('hex').slice(0, 10);

const foods = new Map(JSON.parse(readFileSync(new URL('../src/foods.json', import.meta.url), 'utf8')).map(f => [f.id, f]));
const clockTime = iso => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

// What a chat preview says at a glance: today's confirmed dish, then how to order it.
export function previewText(room, today) {
  const food = foods.get(room.history?.find(meal => meal.date === today)?.foodId);
  const confirmedAt = room.events?.filter(event => event.date === today && event.action !== 'snapshot').at(-1)?.occurredAt;
  const meal = food
    ? `Hôm nay nhóm chốt ${food.emoji} ${food.name}${confirmedAt ? ` lúc ${clockTime(confirmedAt)}` : ''}.`
    : 'Hôm nay nhóm chưa chốt món.';
  const next = room.grabUrl
    ? `${room.grabTitle || 'Đơn nhóm Grab'}: quét mã QR để thêm món.`
    : food ? 'Mở link để xem lịch ăn cả tuần.' : 'Mở link để quay món trưa cùng nhóm.';
  return {
    title: food ? `Hôm nay ăn ${food.name} ${food.emoji} · ${room.name}` : `${room.name} · Luncher`,
    description: `${meal} ${next}`,
  };
}

// Link-preview crawlers do not run JavaScript, so group meta tags are rendered on the server.
export function injectPreview(html, room, origin, today = roomToday(), version) {
  // Only copy a bounded cache token, never arbitrary query parameters, into metadata.
  const token = typeof version === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(version) ? version : null;
  const url = `${origin}/g/${room.id}${token ? `?v=${token}` : ''}`;
  const image = room.grabUrl ? `${origin}/api/qr?id=${room.id}&v=${qrVersion(room.grabUrl)}${token ? `-${token}` : ''}` : null;
  const { title, description } = previewText(room, today);
  const tags = [
    ['property', 'og:type', 'website'], ['property', 'og:url', url],
    ['property', 'og:title', title], ['property', 'og:description', description],
    ...(room.grabUrl ? [
      ['property', 'og:image', image],
      ['property', 'og:image:type', 'image/png'], ['property', 'og:image:width', String(QR_WIDTH)],
      ['property', 'og:image:height', String(QR_HEIGHT)], ['property', 'og:image:alt', `Mã QR đơn nhóm Grab của ${room.name}`],
      ['name', 'twitter:card', 'summary_large_image'],
      ['name', 'twitter:title', title], ['name', 'twitter:description', description],
      ['name', 'twitter:image', image],
    ] : []),
  ].map(([key, name, content]) => `<meta ${key}="${name}" content="${escapeHtml(content)}">`).join('');
  // Browsers use only the first manifest link, so the shell's static app manifest is swapped for the
  // group-bound one (start_url and share target point at this group).
  const manifest = `<link rel="manifest" href="/api/manifest?id=${encodeURIComponent(room.id)}">`;
  const withManifest = /<link rel="manifest"[^>]*>/.test(html)
    ? html.replace(/<link rel="manifest"[^>]*>/, manifest)
    : html.replace('</head>', `${manifest}</head>`);
  return withManifest
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(description)}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace('</head>', `${tags}</head>`);
}

// Serves the SPA shell for /g/:id; the app still loads the group through /api/rooms.
export function createPageHandler(getStore, loadHtml, clock = () => new Date()) {
  return async function pageHandler(req, res) {
    const id = req.query?.id;
    let html = await loadHtml(req);
    try {
      const room = typeof id === 'string' && isRoomCode(id) ? await (await getStore()).get(id) : null;
      if (room) html = injectPreview(html, room, requestOrigin(req), roomToday(clock()), req.query?.v);
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
      // layout=square is the in-app thumbnail; the default is the wide chat-preview card.
      const png = req.query.layout === 'square'
        ? qrCardPng(room.grabUrl, { width: 480, height: 480 })
        : qrCardPng(room.grabUrl);
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
