/* EYZ POS service worker — app-shell caching for offline POS.
 * Strategy:
 *  - Navigations & static assets: network-first, fall back to cache (so the
 *    register loads when offline).
 *  - API GET requests: network-first with cache fallback for read-only data
 *    (products, settings, categories) so the catalog renders offline.
 *  - API writes (POST/PUT/DELETE): never cached; the app's IndexedDB queue
 *    handles offline order capture.
 */
const CACHE = 'eyz-pos-shell-v1';
const APP_SHELL = ['/', '/index.html', '/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isApiGet(request, url) {
  return request.method === 'GET' && url.pathname.includes('/api/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Never interfere with non-GET (writes go through the app's offline queue)
  if (request.method !== 'GET') return;

  if (isApiGet(request, url)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Navigations & static assets: network-first, cache fallback
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
  );
});
