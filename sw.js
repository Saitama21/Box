/* Offline-first app shell; relative URLs work on GitHub Pages project paths. */
const CACHE='cnc-thread-drill-v2-20261023-safe-top-1';
const CORE=['./','./index.html','./styles.css','./app.js','./data.js','./manifest.webmanifest','./icons/favicon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./assets/twist-drill.webp','./assets/threaded-bore.webp','./assets/cutting-tap.webp'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cnc-thread-drill-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});}
    return response;
  })));
});
