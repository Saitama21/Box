const VERSION = '1.1.0';
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
  './modules/result-core.mjs',
  './modules/result.css',
  './modules/result.js',
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

async function freshFirst(request, fallback) {
  try {
    const networkRequest = new Request(request, { cache: 'reload' });
    const response = await fetch(networkRequest);
    if (response && response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (fallback) {
      const local = await caches.match(fallback, { ignoreSearch: true });
      if (local) return local;
    }
    throw new Error('Offline asset unavailable');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(freshFirst(request, './index.html'));
    return;
  }

  const isCode =
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'manifest' ||
    /\.(?:js|mjs|css|html|webmanifest)$/i.test(url.pathname);

  if (isCode) {
    event.respondWith(freshFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
