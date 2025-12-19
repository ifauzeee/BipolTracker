import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

const CACHE_NAME = 'bipol-runtime-v1';

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/socket.io/')) {
    return;
  }

});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-lost-items') {
    event.waitUntil(syncLostItems());
  }
});

async function syncLostItems() {
}

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Bipol Tracker', {
      body: data.body,
      icon: '/images/pwa-icon-192.png',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
  }
});
