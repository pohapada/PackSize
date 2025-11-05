// فایل: sw.js
const CACHE_NAME = 'carton-calculator-v4';
const urlsToCache = [
  '/PackSize/',
  '/PackSize/index.html',
  '/PackSize/manifest.json',
  '/PackSize/icons/icon-192x192.png',
  '/PackSize/icons/icon-512x512.png'
];

self.addEventListener('install', function(event) {
  console.log('Service Worker installing');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('All resources cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.log('Cache installation failed:', error);
      })
  );
});

self.addEventListener('fetch', function(event) {
  // فقط درخواست‌های GET را کش کنید
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // اگر در کش پیدا شد، برگردان
        if (response) {
          return response;
        }
        
        // در غیر این صورت از شبکه fetch کن
        return fetch(event.request).then(function(response) {
          // بررسی که پاسخ معتبر است
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // پاسخ را برای استفاده آینده در کش قرار بده
          var responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activated');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});
