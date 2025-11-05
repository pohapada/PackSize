// sw.js — improved for GitHub Pages (relative paths, offline fallback, cache strategies)
const CACHE_NAME = 'carton-calculator-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  // می‌تونی فایل‌های CSS/JS اضافی را اینجا اضافه کنی، مثال:
  // './styles.css', './main.js'
];

const OFFLINE_FALLBACK = './index.html';

// Install: precache core assets
self.addEventListener('install', event => {
  self.skipWaiting(); // اگر بخواهی سریعاً SW جدید فعال شود (اختیاری)
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(err => {
        console.error('SW install: cache.addAll failed', err);
      })
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('SW activate: deleting old cache', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch handler: network-first for navigations, cache-first for other same-origin assets
self.addEventListener('fetch', event => {
  // only handle GET requests and same-origin resources
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    // let cross-origin requests go to network (e.g., analytics, CDN)
    return;
  }

  // Navigation requests (HTML pages) -> network-first with fallback to cache
  if (event.request.mode === 'navigate' ||
      (event.request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(event.request);
        // update cache with fresh HTML
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, networkResponse.clone().catch(() => {}));
        return networkResponse;
      } catch (err) {
        // اگر شبکه نبود، از کش fallback استفاده کن
        const cached = await caches.match(OFFLINE_FALLBACK);
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  // For other requests (assets): cache-first, but update cache in background
  event.respondWith((async () => {
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) {
      // update cache in background (stale-while-revalidate)
      event.waitUntil((async () => {
        try {
          const networkResp = await fetch(event.request);
          if (networkResp && networkResp.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResp.clone().catch(() => {}));
          }
        } catch (e) {
          // ignore network errors for background update
        }
      })());
      return cachedResponse;
    }

    // not cached -> fetch from network then cache if valid
    try {
      const networkResp = await fetch(event.request);
      if (!networkResp || networkResp.status !== 200 || networkResp.type === 'opaque') {
        return networkResp;
      }
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, networkResp.clone().catch(() => {}));
      return networkResp;
    } catch (err) {
      // final fallback: try index.html (useful for SPA/assets)
      const fallback = await caches.match(OFFLINE_FALLBACK);
      return fallback || new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});

// Allow page to tell SW to skipWaiting (activate immediately)
self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
