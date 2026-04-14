// Service Worker — Perks App
// Versión: actualizar este string al hacer cambios para forzar recarga
const CACHE_NAME = 'perks-v2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

// INSTALL — precachear assets esenciales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => {
      // Si algún asset no existe aún, no fallar
      console.warn('SW install cache warning:', err);
    })
  );
  self.skipWaiting();
});

// ACTIVATE — limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// FETCH — cache-first para assets, network-first para todo lo demás
self.addEventListener('fetch', event => {
  // Solo manejar peticiones GET
  if (event.request.method !== 'GET') return;

  // Para CDN externas (chart.js), solo intentar red
  if (event.request.url.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Cache-first: si está cacheado, devolverlo
      if (cached) return cached;
      // Si no, buscar en red y cachear para después
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return response;
      }).catch(() => {
        // Offline fallback: devolver index.html para navegación
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});