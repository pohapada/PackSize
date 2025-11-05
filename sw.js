// sw.js — improved for GitHub Pages (relative paths, offline fallback, cache strategies)
const CACHE_NAME = 'carton-calculator-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

const OFFLINE_FALLBACK = './index.html';

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(err => {
        console.error('SW install: cache.addAll failed', err);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === 'navigate' ||
      (event.request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, networkResponse.clone().catch(() => {}));
        return networkResponse;
      } catch (err) {
        const cached = await caches.match(OFFLINE_FALLBACK);
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) {
      event.waitUntil((async () => {
        try {
          const networkResp = await fetch(event.request);
          if (networkResp && networkResp.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResp.clone().catch(() => {}));
          }
        } catch (e) {}
      })());
      return cachedResponse;
    }

    try {
      const networkResp = await fetch(event.request);
      if (!networkResp || networkResp.status !== 200 || networkResp.type === 'opaque') {
        return networkResp;
      }
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, networkResp.clone().catch(() => {}));
      return networkResp;
    } catch (err) {
      const fallback = await caches.match(OFFLINE_FALLBACK);
      return fallback || new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});

self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
