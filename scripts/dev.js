import { createServer as createHttpServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import { readFile } from 'node:fs/promises';
import handler from '../api/rooms.js';
import qrHandler from '../api/qr.js';
import { createPageHandler } from '../server/preview.js';
import { neonStore } from '../server/neon.js';

// Same-origin local API + Vite; Vercel runs api/rooms.js itself in production.
export async function startDevServer(apiHandler = handler, port = 5173, getStore = neonStore, imageHandler = qrHandler) {
  const root = new URL('../index.html', import.meta.url);
  let vite, pageHandler;
  const server = createHttpServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    req.query = Object.fromEntries(url.searchParams);
    const group = url.pathname.match(/^\/g\/([^/]+)$/);
    if (group) {
      req.query = { id: group[1] };
      return pageHandler(req, res).catch(() => { if (!res.writableEnded) { res.statusCode = 500; res.end(); } });
    }
    // Mirrors the vercel.json rewrite for the drink picker page.
    if (url.pathname === '/chieunayuonggi') req.url = '/chieunayuonggi/' + url.search;
    if (url.pathname === '/api/qr') return imageHandler(req, res);
    if (url.pathname !== '/api/rooms') return vite.middlewares(req, res);
    res.status = code => { res.statusCode = code; return res; };
    res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
    try {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 4096) {
          res.status(413).json({ error: 'Dữ liệu quá dài.' });
          return;
        }
      }
      req.body = raw;
      await apiHandler(req, res);
    } catch {
      if (!res.writableEnded) res.status(500).json({ error: 'Không xử lý được yêu cầu.' });
    }
  });
  // Hot reload shares the app's HTTP server, so several dev servers on different
  // ports never compete for Vite's default standalone WebSocket port.
  vite = await createViteServer({ server: { middlewareMode: true, hmr: { server } }, appType: 'spa' });
  pageHandler = createPageHandler(getStore, async req => vite.transformIndexHtml(req.url, await readFile(root, 'utf8')));
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  return { server, close: async () => { await new Promise(resolve => server.close(resolve)); await vite.close(); } };
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  await startDevServer();
  console.log('Luncher frontend + API running on port 5173. Set DATABASE_URL in .env.local for Neon.');
}
