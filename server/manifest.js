import { isRoomCode } from './room-codes.js';

export function buildManifest(code, roomName) {
  const trimmed = typeof roomName === 'string' ? roomName.trim() : '';
  const name = trimmed ? `Luncher · ${trimmed.slice(0, 45)}` : 'Luncher';
  const short_name = trimmed.slice(0, 20) || 'Luncher';
  return {
    id: `/g/${code}`,
    start_url: `/g/${code}`,
    scope: '/',
    display: 'standalone',
    name,
    short_name,
    lang: 'vi',
    theme_color: '#faf7f2',
    background_color: '#f6f1ea',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    share_target: {
      action: `/g/${code}`,
      method: 'GET',
      params: {
        title: 'share_title',
        text: 'share_text',
        url: 'share_url',
      },
    },
  };
}

export function createManifestHandler(getStore) {
  return async function manifestHandler(req, res) {
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end('Method not allowed');
      return;
    }
    const id = req.query?.id;
    if (typeof id !== 'string' || !isRoomCode(id)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end('Not found');
      return;
    }
    let room = null;
    try {
      room = await (await getStore()).get(id);
    } catch {
      // Lookup failed; fall back to generic name rather than erroring
    }
    const manifest = buildManifest(id, room?.name);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify(manifest, null, 2));
  };
}
