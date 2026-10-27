import { readFileSync } from 'node:fs';
import { isRoomCode } from './room-codes.js';
import { roomToday } from './calendar.js';
import { normalizeGrabUrl } from './grab.js';
const ids = new Set(JSON.parse(readFileSync(new URL('../src/foods.json', import.meta.url), 'utf8')).map(f => f.id));

export function createHandler(getStore, clock = () => new Date()) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const send = (status, body) => res.status(status).json(body);
    if (!['GET', 'POST'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST');
      return send(405, { error: 'Phương thức không được hỗ trợ.' });
    }
    try {
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) {
        return send(403, { error: 'Hãy thao tác từ trang Luncher của nhóm.' });
      }
      let body = {};
      if (req.method === 'POST') {
        if (!req.headers['content-type']?.startsWith('application/json')) {
          return send(415, { error: 'Yêu cầu phải là JSON.' });
        }
        try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
        catch { return send(400, { error: 'JSON không hợp lệ.' }); }
        if (!body || Array.isArray(body) || typeof body !== 'object' || JSON.stringify(body).length > 4096) {
          return send(400, { error: 'Dữ liệu không hợp lệ hoặc quá dài.' });
        }
      }
      const today = roomToday(clock());
      if (req.method === 'POST' && body.action === 'create') {
        if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 60) {
          return send(400, { error: 'Tên nhóm cần từ 1 đến 60 ký tự.' });
        }
        const store = await getStore();
        const id = await store.create(body.name.trim());
        return send(201, { room: await store.get(id), today });
      }
      const id = req.method === 'GET' ? req.query?.id : body.id;
      if (typeof id !== 'string' || !isRoomCode(id)) return send(400, { error: 'Link nhóm không hợp lệ.' });
      if (req.method === 'GET') {
        const room = await (await getStore()).get(id);
        return room ? send(200, { room, today }) : send(404, { error: 'Không tìm thấy nhóm. Kiểm tra lại link nhé.' });
      }
      if (!['confirm', 'replace', 'rename', 'grab'].includes(body.action) || !Number.isSafeInteger(body.revision) || body.revision < 0) {
        return send(400, { error: 'Thao tác không hợp lệ.' });
      }
      if (['confirm', 'replace'].includes(body.action) && (!ids.has(body.foodId) || typeof body.repeat !== 'boolean')) {
        return send(400, { error: 'Món hoặc tùy chọn lặp không hợp lệ.' });
      }
      if (body.action === 'rename' && (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 60)) {
        return send(400, { error: 'Tên nhóm cần từ 1 đến 60 ký tự.' });
      }
      const grabUrl = body.action === 'grab' ? normalizeGrabUrl(body.grabUrl) : undefined;
      if (grabUrl === false) return send(400, { error: 'Link Grab cần bắt đầu bằng https:// và thuộc grab.com.' });
      // The server's day wins; reject a page that was left open across midnight.
      if (['confirm', 'replace'].includes(body.action) && body.today !== today) return send(409, { error: 'Đã sang ngày mới. Tải lại kết quả trước khi chốt nhé.' });
      const store = await getStore();
      const changed = body.action === 'rename'
        ? await store.rename({ id, revision: body.revision, name: body.name.trim() })
        : body.action === 'grab' ? await store.setGrabUrl({ id, revision: body.revision, grabUrl })
        : await store.choose({ id, revision: body.revision, today, foodId: body.foodId,
          replace: body.action === 'replace', repeat: body.repeat });
      if (!changed) {
        const room = await store.get(id);
        return room ? send(409, { error: 'Nhóm đã có thay đổi hoặc món này đã ăn trong tuần. Kết quả vừa được cập nhật.', room, today })
          : send(404, { error: 'Không tìm thấy nhóm.' });
      }
      return send(200, { room: await store.get(id), today });
    } catch (error) {
      // No DB connection strings, SQL text or raw provider errors in responses/logs.
      const unavailable = error.code === 'DATABASE_NOT_CONFIGURED' || error.code === '42P01';
      return send(503, { error: unavailable
        ? 'Chưa sẵn sàng kết nối nhóm. Cần cấu hình DATABASE_URL và chạy schema Neon.'
        : 'Chưa kết nối được nhóm. Thử tải lại sau nhé.' });
    }
  };
}
