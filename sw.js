const CACHE_NAME = "ol-v1";
const ASSETS = [
  "/", "/index.html", "/styles.css", "/app.js", "/firebase.js",
  "/login.html", "/login.js", "/manifest.json",
  "/icons/icon-192.png", "/icons/icon-256.png", "/icons/icon-384.png",
  "/icons/icon-512.png", "/icons/icon-512-maskable.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then(
      (r) =>
        r ||
        fetch(e.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
            return res;
          })
          .catch(() => caches.match("/index.html"))
    )
  );
});
