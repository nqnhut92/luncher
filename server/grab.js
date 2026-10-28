// Only Grab's own https hosts; the link ends up in a QR code that members scan.
const grabHost = host => host === 'grab.com' || host.endsWith('.grab.com') || host === 'grab.onelink.me';

// Returns the canonical link, null to clear it, or false when the input is invalid.
export function normalizeGrabUrl(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (!text) return null;
  if (text.length > 500) return false;
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' || url.username || url.password || !grabHost(url.hostname)) return false;
    return url.href.length <= 500 ? url.href : false;
  } catch { return false; }
}

// Preview art is hotlinked from Grab, so only Grab's https hosts are accepted.
export function grabImageUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname;
    const ok = url.protocol === 'https:' && !url.username && !url.password
      && (host === 'grab.com' || host.endsWith('.grab.com')) && url.href.length <= 500;
    return ok ? url.href : null;
  } catch { return null; }
}

const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = text => text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
  if (code[0] !== '#') return entities[code.toLowerCase()] ?? match;
  const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
  return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
});

// Reads Open Graph tags from Grab's share page; nothing else on the page is trusted.
const cleanTitle = value => (value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
const details = (title, image) => {
  const result = { title: cleanTitle(title) || null, image: grabImageUrl(image || '') };
  return result.title || result.image ? result : null;
};

// Grab short links redirect to an app deep link that repeats its share details as og_* parameters.
export function grabLinkDetails(link) {
  try {
    const { searchParams } = new URL(link);
    return details(searchParams.get('og_title'), searchParams.get('og_image'));
  } catch { return null; }
}

export function parseGrabMeta(html) {
  const meta = {};
  for (const [tag] of html.matchAll(/<meta\s[^>]*>/gi)) {
    const attrs = Object.fromEntries([...tag.matchAll(/([a-z:-]+)\s*=\s*("([^"]*)"|'([^']*)')/gi)]
      .map(([, key, , double, single]) => [key.toLowerCase(), decode(double ?? single)]));
    const key = (attrs.property || attrs.name || '').toLowerCase();
    if (key && attrs.content && !(key in meta)) meta[key] = attrs.content;
  }
  return details(meta['og:title'] || meta['twitter:title'], meta['og:image'] || meta['twitter:image']);
}

export async function readLimited(response, limit) {
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw new Error('Response too large'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

// Redirect hops obey the stored-link host rules; Grab's deep links exceed 500 characters.
function redirectTarget(location, base) {
  try {
    const url = new URL(location || '', base);
    const ok = url.protocol === 'https:' && !url.username && !url.password && grabHost(url.hostname) && url.href.length <= 4096;
    return ok ? url.href : null;
  } catch { return null; }
}

// Follows only redirects that stay on allowed Grab hosts, with a time and size budget,
// so a group link cannot make the server fetch arbitrary addresses.
export async function scanGrabLink(link, { fetchImpl = fetch, timeoutMs = 4000 } = {}) {
  const signal = AbortSignal.timeout(timeoutMs);
  let url = link;
  const direct = grabLinkDetails(link);
  if (direct) return direct;
  for (let hop = 0; hop < 4; hop++) {
    const response = await fetchImpl(url, { redirect: 'manual', signal,
      headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0 (compatible; LuncherPreview/1.0)' } });
    if (response.status >= 300 && response.status < 400) {
      const next = redirectTarget(response.headers.get('location'), url);
      if (!next) return null;
      const fromLink = grabLinkDetails(next);
      if (fromLink) return fromLink;
      url = next;
      continue;
    }
    if (!response.ok || !/text\/html/i.test(response.headers.get('content-type') || '')) return null;
    return parseGrabMeta((await readLimited(response, 256 * 1024)).toString('utf8'));
  }
  return null;
}

// Best effort: a slow or changed Grab page must never block saving the link.
export const safeScan = scan => async link => {
  try { return (await scan(link)) || { title: null, image: null }; }
  catch { return { title: null, image: null }; }
};
