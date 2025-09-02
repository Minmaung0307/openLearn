const CACHE = "ol-v8";
const ASSETS = [
  "/", "/index.html", "/styles.css", "/app.js", "/firebase.js",
  "/manifest.json", "/login.html", "/login.js",
  "/data/catalog.json",
  "/data/pages/contact.json", "/data/pages/guide.json",
  "/data/pages/privacy.json", "/data/pages/policy.json"
];
self.addEventListener("install", e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener("activate", e=>{ e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e=>{
  if(e.request.method!=="GET") return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); return res; }).catch(()=>caches.match("/index.html"))));
});