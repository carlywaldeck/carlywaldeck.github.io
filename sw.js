// Weekender service worker: makes the site installable and usable offline.
// Pages: network first (so updates show right away), falling back to the cached copy when offline.
// Static files (icons, the map library, fonts): cache first.
const CACHE = "weekender-v1";
const CORE = ["./", "index.html", "privacy.html", "favicon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  const sameOrigin = url.origin === self.location.origin;
  const isStatic = /\.(png|svg|woff2?|css|webmanifest)$/.test(url.pathname) || url.hostname === "cdn.jsdelivr.net" || url.hostname.endsWith("gstatic.com") || url.hostname === "fonts.googleapis.com";
  if (req.mode === "navigate" || (sameOrigin && /\.html$|\/$/.test(url.pathname))) {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("index.html"))));
  } else if (isStatic) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
  }
  // Everything else (live APIs, accounts) goes straight to the network.
});
