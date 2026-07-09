// PersonalAssist AI Service Worker for native Android WebAPK PWA installation
const CACHE_NAME = 'personalassist-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through network fetch required by Android Chrome WebAPK generator
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
