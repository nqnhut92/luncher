// Minimal network-only service worker for Luncher group PWA and Web Share Target.
// No caching of HTML or API responses: group meal decisions must stay fresh.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/')) return;
  event.respondWith(fetch(event.request));
});
