const CACHE_NAME="ol-v4";
const ASSETS=[
  "/", "/index.html", "/styles.css", "/app.js", "/firebase.js",
  "/login.html", "/login.js", "/manifest.json",
  "/icons/icon-192.png", "/icons/icon-256.png", "/icons/icon-384.png",
  "/icons/icon-512.png", "/icons/icon-512-maskable.png"
];
self.addEventListener("install",(e)=>{ e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener("activate",(e)=>{ e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch",(e)=>{
  const req=e.request; if(req.method!=="GET") return;
  e.respondWith(caches.match(req).then(cached=>{
    if(cached) return cached;
    return fetch(req).then(res=>{
      const isSame=new URL(req.url).origin===self.location.origin;
      if(isSame && res && res.ok && res.type==="basic"){ const copy=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(req, copy)); }
      return res;
    }).catch(()=>{ if(req.mode==="navigate") return caches.match("/index.html"); return Promise.reject(); });
  }));
});
