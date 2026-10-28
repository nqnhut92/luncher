import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';
import { isRoomCode } from './room-codes.js';
import { grabImageUrl, readLimited } from './grab.js';
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

// Bilinear scaling of the RGBA art over the cream background.
function drawArt(png, art, left, top, width, height) {
  const sample = (x, y, c) => art.data[(y * art.width + x) * 4 + c];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = Math.min(Math.max((x + 0.5) * art.width / width - 0.5, 0), art.width - 1);
    const sy = Math.min(Math.max((y + 0.5) * art.height / height - 0.5, 0), art.height - 1);
    const x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.min(x0 + 1, art.width - 1), y1 = Math.min(y0 + 1, art.height - 1);
    const fx = sx - x0, fy = sy - y0;
    const mix = c => (sample(x0, y0, c) * (1 - fx) + sample(x1, y0, c) * fx) * (1 - fy)
      + (sample(x0, y1, c) * (1 - fx) + sample(x1, y1, c) * fx) * fy;
    const alpha = mix(3) / 255, i = ((top + y) * png.width + left + x) * 4;
    for (let c = 0; c < 3; c++) png.data[i + c] = Math.round(mix(c) * alpha + png.data[i + c] * (1 - alpha));
  }
}

// art is Grab's decoded share image (store name, address, rating); without it the QR is centred.
export function qrCardPng(text, art = null, { width = QR_WIDTH, height = QR_HEIGHT } = {}) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const quiet = 4;
  const artScale = art ? Math.min(680 / art.width, 510 / art.height) : 0;
  const artWidth = Math.round(art?.width * artScale), artHeight = Math.round(art?.height * artScale);
  const area = art ? 400 : Math.min(width, height) - 70;
  const scale = Math.floor(area / (modules.size + quiet * 2));
  const box = (modules.size + quiet * 2) * scale;
  const left = art ? 760 + Math.floor((400 - box) / 2) : Math.floor((width - box) / 2);
  const top = Math.floor((height - box) / 2);
  const png = new PNG({ width, height });
  const paint = (x, y, [r, g, b]) => { const i = (y * width + x) * 4; png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255; };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const inBox = x >= left && x < left + box && y >= top && y < top + box;
    const mx = Math.floor((x - left) / scale) - quiet, my = Math.floor((y - top) / scale) - quiet;
    const dark = inBox && mx >= 0 && my >= 0 && mx < modules.size && my < modules.size && modules.get(my, mx);
    // Plain cream background; pure black on white keeps the code scannable.
    paint(x, y, dark ? [0, 0, 0] : inBox ? [255, 255, 255] : CREAM);
  }
  if (art) drawArt(png, art, 40, Math.floor((height - artHeight) / 2), artWidth, artHeight);
  return PNG.sync.write(png);
}

// Fetches and decodes the saved Grab share image. PNG only (what Grab serves today);
// anything else, oversized or slow, falls back to the plain QR card.
export async function fetchGrabArt(imageUrl, { fetchImpl = fetch, timeoutMs = 3000 } = {}) {
  if (!grabImageUrl(imageUrl)) return null;
  try {
    const response = await fetchImpl(imageUrl, { redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return null;
    const bytes = await readLimited(response, 2 * 1024 * 1024);
    const isPng = bytes.length > 24 && bytes.readUInt32BE(0) === 0x89504e47;
    // Check the declared size before decoding so a tiny file cannot expand into a huge bitmap.
    if (!isPng || bytes.readUInt32BE(16) > 2000 || bytes.readUInt32BE(20) > 2000) return null;
    return PNG.sync.read(bytes);
  } catch { return null; }
}

// The version changes with the link and its art so chat apps do not keep showing a stale card.
export const qrVersion = (grabUrl, grabImage = null) => createHash('sha256')
  .update(grabImage ? `${grabUrl}\n${grabImage}` : grabUrl).digest('hex').slice(0, 10);

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
export function injectPreview(html, room, origin, today = roomToday()) {
  const url = `${origin}/g/${room.id}`;
  const { title, description } = previewText(room, today);
  const tags = [
    ['property', 'og:type', 'website'], ['property', 'og:url', url],
    ['property', 'og:title', title], ['property', 'og:description', description],
    ...(room.grabUrl ? [
      ['property', 'og:image', `${origin}/api/qr?id=${room.id}&v=${qrVersion(room.grabUrl, room.grabImage)}`],
      ['property', 'og:image:type', 'image/png'], ['property', 'og:image:width', String(QR_WIDTH)],
      ['property', 'og:image:height', String(QR_HEIGHT)], ['property', 'og:image:alt', room.grabImage
        ? `${room.grabTitle || 'Đơn nhóm Grab'}: thông tin quán và mã QR của ${room.name}`
        : `Mã QR đơn nhóm Grab của ${room.name}`],
      ['name', 'twitter:card', 'summary_large_image'],
    ] : []),
  ].map(([key, name, content]) => `<meta ${key}="${name}" content="${escapeHtml(content)}">`).join('');
  return html
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
      if (room) html = injectPreview(html, room, requestOrigin(req), roomToday(clock()));
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

export function createQrHandler(getStore, loadArt = fetchGrabArt) {
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
      // layout=square is the in-app thumbnail: QR only, no remote art.
      const png = req.query.layout === 'square'
        ? qrCardPng(room.grabUrl, null, { width: 480, height: 480 })
        : qrCardPng(room.grabUrl, room.grabImage ? await loadArt(room.grabImage) : null);
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
