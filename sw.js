const VERSION = '1.0.1';
const CACHE_PREFIX = 'cnc-suite-';
const CACHE = `${CACHE_PREFIX}${VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './modules/box.css',
  './modules/box.js',
  './modules/box-core.mjs',
  './modules/modes.css',
  './modules/modes.js',
  './modules/modes-data.mjs',
  './modules/cutcalc.css',
  './modules/cutcalc.js',
  './modules/cutcalc-core.mjs',
  './modules/geometry.css',
  './modules/geometry.js',
  './modules/geometry-core.mjs',
  './modules/copilot.css',
  './modules/copilot.js',
  './modules/copilot-core.mjs',
  './modules/copilot-materials.mjs',
  './modules/copilot-data.js',
  './modules/codes.css',
  './modules/codes.js',
  './modules/codes-data.mjs',
  './modules/profile.css',
  './modules/profile.js',
  './modules/module-registry.mjs',
  './modules/machine-store.mjs',
  './modules/tools.css',
  './modules/tools.js',
  './modules/projects.css',
  './modules/projects.js',
  './modules/workspace-store.mjs',
  './modules/workflow.css',
  './modules/workflow.js',
  './assets/cutcalc/result-rod.webp',
  './assets/cutcalc/rod-brass.webp',
  './assets/cutcalc/rod-steel.webp',
  './assets/modes/card-aisi304.webp',
  './assets/modes/card-steel.webp',
  './assets/modes/card-polyamide.webp',
  './assets/modes/card-brass.webp',
  './manifest.webmanifest',
  './.nojekyll'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok && url.pathname.endsWith('/Box/')) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(async () => {
          const exact = await caches.match(event.request);
          return exact || caches.match('./index.html');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
