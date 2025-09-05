const CACHE="ol-v1";
self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(["/","/index.html","/styles.css","/app.js","/firebase.js","/config.js","/manifest.json"])));
});
self.addEventListener("fetch", e=>{
  const req=e.request;
  if(req.method!=="GET"){ return; } // ← POST/PUT skip (fix your previous error)
  e.respondWith(
    caches.match(req).then(r=> r || fetch(req).then(res=>{
      const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy));
      return res;
    }))
  );
});