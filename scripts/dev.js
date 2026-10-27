import { createServer as createHttpServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import handler from '../api/rooms.js';

// Same-origin local API + Vite; Vercel runs api/rooms.js itself in production.
export async function startDevServer(apiHandler = handler, port = 5173) {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  const server = createHttpServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/api/rooms') return vite.middlewares(req, res);
    res.status = code => { res.statusCode = code; return res; };
    res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
    req.query = Object.fromEntries(url.searchParams);
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
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  return { server, close: async () => { await new Promise(resolve => server.close(resolve)); await vite.close(); } };
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  await startDevServer();
  console.log('Luncher frontend + API running on port 5173. Set DATABASE_URL in .env.local for Neon.');
}
