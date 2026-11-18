// Service worker : garde l'appli disponible même avec un réseau faible sur la digue.
const CACHE = "carte-peche-v2";
const SHELL = ["./", "index.html", "css/style.css", "js/spots.js", "js/model.js", "js/app.js", "icon.svg", "manifest.webmanifest",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  const isShell = url.origin === location.origin || url.hostname === "unpkg.com";
  if (!isShell || e.request.method !== "GET") return; // météo, tuiles : toujours en direct
  // Réseau d'abord (pour recevoir les mises à jour), cache en secours
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request)));
});
