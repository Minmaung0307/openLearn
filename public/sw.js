// sw.js (safe caching for same-origin GET only)
const CACHE = 'ol-v8';
const ASSETS = [
  '/', '/index.html', '/styles.css', '/app.js',
  '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {/* ignore missing files during install */})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// sw.js

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // const url = new URL(req.url);
  const url = new URL(event.request.url);

  // Always fetch fresh course data (no SW cache)
  if (url.origin === location.origin && url.pathname.startsWith('/data/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 1) Only handle same-origin GET
  const isSameOrigin = url.origin === self.location.origin;
  if (req.method !== 'GET' || !isSameOrigin) return;

  // 2) Normal cache-first/network fallback (edit to your strategy)
  event.respondWith((async () => {
    const cache = await caches.open('openlearn-v1');
    const cached = await cache.match(req);
    if (cached) return cached;
    const res = await fetch(req);
    // Only cache successful, basic (same-origin) GET responses
    if (res.ok && res.type === 'basic') {
      cache.put(req, res.clone());
    }
    return res;
  })());
});
// self.addEventListener('fetch', (event) => {
//   const req = event.request;
//   if (req.method !== 'GET') return;

//   const url = new URL(req.url);
//   if (url.host.includes('paypal.com') ||
//       url.pathname.includes('/google.firestore.v1.Firestore/')) return;

//   event.respondWith(
//     caches.open('ol-v1').then(async (cache)=>{
//       const hit = await cache.match(req);
//       if (hit) return hit;
//       const res = await fetch(req);
//       if (res && res.ok) cache.put(req, res.clone());
//       return res;
//     })
//   );
// });
// self.addEventListener('fetch', (event) => {
//   const req = event.request;
//   // Only handle same-origin GET. Ignore POST/PUT and any cross-origin (e.g. PayPal).
//   if (req.method !== 'GET') return;
//   const url = new URL(req.url);
//   if (url.origin !== location.origin) return;

//   event.respondWith(
//     caches.match(req).then(cached => {
//       if (cached) return cached;
//       return fetch(req).then(resp => {
//         // Only cache OK responses
//         if (!resp || resp.status !== 200) return resp;
//         const clone = resp.clone();
//         caches.open(CACHE).then(c => c.put(req, clone)).catch(()=>{});
//         return resp;
//       }).catch(() => cached); // offline fallback if we had cached
//     })
//   );
// });