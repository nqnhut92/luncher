import { inject } from '@vercel/analytics';
import { canTrackPage, filterAnalyticsEvent } from './analytics-privacy.js';

let initialized = false;
const browserContext = () => ({
  href: window.location.href,
  referrer: document.referrer,
  doNotTrack: [navigator.doNotTrack, window.doNotTrack].some(value => value === '1' || value === 'yes'),
  globalPrivacyControl: navigator.globalPrivacyControl === true,
});

export function initializeAnalytics() {
  // Vite development/test servers do not load the analytics script or log URLs.
  if (initialized || !import.meta.env.PROD || !canTrackPage(browserContext())) return;
  initialized = true;
  inject({
    mode: 'production',
    debug: false,
    framework: 'vite',
    // Read location/signals on every event, not just at initial page load.
    beforeSend: event => filterAnalyticsEvent(event, browserContext()),
  });
}
