// Fail closed: only the clean public homepage is eligible. New routes require
// an explicit privacy review; group codes and order links grant access.
function cleanRoot(raw) {
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      && url.pathname === '/' && !url.search && !url.hash ? url : null;
  } catch { return null; }
}
export function canTrackPage(context) {
  if (!context || context.doNotTrack || context.globalPrivacyControl) return false;
  if (!cleanRoot(context.href)) return false;
  // beforeSend cannot rewrite the SDK's independently collected referrer.
  // Drop the event if a referrer contains a path, query, fragment or credentials.
  return !context.referrer || Boolean(cleanRoot(context.referrer));
}
export function filterAnalyticsEvent(event, context) {
  if (event?.type !== 'pageview' || !canTrackPage(context)) return null;
  const page = cleanRoot(event.url);
  const current = cleanRoot(context.href);
  if (!page || page.origin !== current.origin) return null;
  // Do not forward arbitrary event fields, custom properties, names or form data.
  return { type: 'pageview', url: `${current.origin}/` };
}
