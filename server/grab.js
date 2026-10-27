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
