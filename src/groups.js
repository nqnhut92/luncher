export async function roomRequest(options = {}) {
  const { id, ...body } = options;
  const read = !body.action;
  const response = await fetch(read ? `/api/rooms?id=${encodeURIComponent(id)}` : '/api/rooms', {
    method: read ? 'GET' : 'POST',
    headers: read ? {} : { 'Content-Type': 'application/json' },
    body: read ? undefined : JSON.stringify({ ...body, ...(id ? { id } : {}) }),
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json().catch(() => ({ error: 'API nhóm chưa sẵn sàng. Chạy npm run dev:full để dùng nhóm ở local.' }));
  if (!response.ok) throw Object.assign(new Error(data.error || 'Không kết nối được nhóm.'), { data });
  return data;
}
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c]);
