/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// Service Worker lifecycle
self.addEventListener('install', () => {
  // Biarkan SW menunggu sampai dipanggil secara aman oleh useSeamlessUpdate
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// Navigasi HTML tidak di-cache oleh SW runtime untuk mencegah index.html usang
// saat hard-refresh / pull-to-refresh. Navigasi langsung ke jaringan (NetworkOnly).

// Cache static assets (images, fonts, styles, scripts)
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker' ||
    request.destination === 'image' ||
    request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Clear runtime caches on demand. The app posts { type: 'CLEAR_CACHES' } on
// logout and on tenant/user switch so that private API responses of a previous
// session can never be served (offline/slow-network fallback) to a different
// session on the same origin. The precache is left intact: it only holds
// immutable static assets, never tenant-scoped data.
self.addEventListener('message', (event) => {
  if (event.data) {
    if (event.data.type === 'CLEAR_CACHES') {
      event.waitUntil(
        Promise.all(['api-cache', 'pages-cache'].map((name) => caches.delete(name)))
      );
    }
    if (event.data.type === 'SKIP_WAITING' || event.data === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  }
});

self.addEventListener('skipWaiting', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Hapus semua pages-cache atau cache lama yang mengandung index.html
          if (key.includes('pages-cache') || key.includes('api-cache')) {
            return caches.delete(key);
          }
          return Promise.resolve(true);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ---------- Web Push (Fase 4) ----------
interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
}

self.addEventListener('push', (event) => {
  let data: PushPayload = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() || '' };
  }
  const title = data.title || 'Kabar RT';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { url: data.url || '/public/announcements' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url: string = (event.notification.data && event.notification.data.url) || '/public/announcements';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
