self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>self.clients.claim());
const CACHE='ol-v1';
self.addEventListener('fetch',evt=>{
  const req=evt.request; if(req.method!=='GET') return;
  evt.respondWith((async()=>{const c=await caches.open(CACHE);
    const hit=await c.match(req); if(hit) return hit;
    const res=await fetch(req); if(res.ok && new URL(req.url).origin===location.origin) c.put(req,res.clone()); return res;})());
});