const CACHE_NAME = 'bipol-tracker-v1';
const urlsToCache = [
  '/',
  './style.css',
  './script.js',
  './images/bipol.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;


  if (url.includes('openfreemap.org')) return;

  if (event.request.method !== 'GET') return;

  if (url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
      });
    })
  );
});