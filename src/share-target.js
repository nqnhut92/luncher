// Pure Grab URL validator and share target extractor.
// Usable in both browser (src/) and server (server/) without Node-only APIs.

export const isGrabHost = host =>
  typeof host === 'string' && (host === 'grab.com' || host.endsWith('.grab.com') || host === 'grab.onelink.me');

// Returns the canonical link, null to clear it, or false when the input is invalid.
export function normalizeGrabUrl(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (!text) return null;
  if (text.length > 500) return false;
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' || url.username || url.password || !isGrabHost(url.hostname)) return false;
    return url.href.length <= 500 ? url.href : false;
  } catch {
    return false;
  }
}

const TRAILING_PUNCTUATION = /[.,!?:;)}\]>"'’”…]+$/u;

// Searches url, then text, then title for https:// tokens.
// Returns the first valid Grab order URL, or null if none found.
export function extractGrabUrl(shareData) {
  if (!shareData || typeof shareData !== 'object') return null;
  const fields = [shareData.url, shareData.text, shareData.title];
  for (const field of fields) {
    if (typeof field !== 'string') continue;
    const matches = field.match(/https:\/\/\S+/g);
    if (!matches) continue;
    for (const raw of matches) {
      let token = raw;
      while (TRAILING_PUNCTUATION.test(token)) {
        token = token.replace(TRAILING_PUNCTUATION, '');
      }
      const valid = normalizeGrabUrl(token);
      if (valid) return valid;
    }
  }
  return null;
}
