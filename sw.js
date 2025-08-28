// This is the "Offline copy of pages" service worker

const CACHE_NAME = "pwabuilder-offline-v1";
const PRECACHE_FILES = [
  './',
  'sol.html',
  'sol.css',
  'cards.js',
  'gl-matrix.min.js',
  'vrxr.js',
  'sol.js',
  'cir.css',
  'cir.html',
  'cir.js',
  'cirgen.js',
  'css.css',
  'manifest.json'
];

importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Pre-cache all essential files during installation
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Pre-caching offline page');
        return cache.addAll(PRECACHE_FILES);
      })
  );
});

// Use StaleWhileRevalidate for all other requests
workbox.routing.registerRoute(
  new RegExp('/*'),
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: CACHE_NAME
  })
);

// Clean up old caches during activation
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (CACHE_NAME !== cacheName) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});