/* Network-first application shell: fresh themes when online, full offline fallback. */
const CACHE='cnc-thread-drill-v3-1-20261023';
const CORE=['./','./index.html','./styles.css','./themes.css','./app.js','./data.js','./manifest.webmanifest','./icons/favicon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./assets/twist-drill.webp','./assets/threaded-bore.webp','./assets/cutting-tap.webp'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('cnc-thread-drill-')&&key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try {
      const response=await fetch(request,{cache:'no-store'});
      if(response.ok){
        const key=request.mode==='navigate'?'./index.html':request;
        event.waitUntil(cache.put(key,response.clone()).catch(()=>{}));
      }
      return response;
    } catch(error) {
      const cached=request.mode==='navigate'
        ? await cache.match('./index.html') || await cache.match('./')
        : await cache.match(request);
      if(cached)return cached;
      throw error;
    }
  })());
});
