// Travel Companion PWA Service Worker
// Caches static shell assets only. NEVER caches Supabase Storage or sensitive documents.

const CACHE_NAME = 'travel-companion-static-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Security Requirement: Never cache private documents, signed URLs, or auth endpoints
  if (
    request.method !== 'GET' ||
    url.pathname.includes('/storage/v1/') ||
    url.pathname.includes('/auth/v1/') ||
    url.pathname.includes('/rest/v1/')
  ) {
    return;
  }

  // Network-first with offline fallback for navigation and static assets
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && url.origin === self.location.origin) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        throw new Error('Offline and not cached');
      })
  );
});
