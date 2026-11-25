// Service worker : garde l'appli disponible sans réseau ou avec un réseau faible sur la digue.
// - L'appli elle-même (pages, scripts, Leaflet) : réseau d'abord pour recevoir les mises à jour (au plus 5 s), mémoire en secours.
// - Les morceaux de carte (tuiles) et les polices : ceux déjà regardés sont gardés et resservis sans réseau
//   (au plus 3000 tuiles, les plus anciennes sont effacées). On ne télécharge jamais de zone en avance :
//   les règles d'OpenStreetMap l'interdisent.
// - La météo, la mer, la houle mesurée et les débits ne passent pas par ici : l'appli garde la dernière réponse dans le téléphone.
const CACHE = "carte-peche-v23";
const TILES = "carte-peche-tuiles";
const MAX_TILES = 3000;
const SHELL = ["./", "index.html", "css/style.css", "js/spots.js", "js/model.js", "js/data.js", "js/app.js", "icon.svg", "manifest.webmanifest",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"];
const TILE_HOSTS = ["tile.openstreetmap.fr", "server.arcgisonline.com", "fonts.googleapis.com", "fonts.gstatic.com"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys()
  .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== TILES).map(k => caches.delete(k))))
  // Anciennes tuiles CARTO (fond de nuit abandonné le 18 nov. 2026, marquées « API KEY REQUIRED ») : effacées.
  .then(() => caches.open(TILES)).then(c => c.keys().then(ks => Promise.all(ks.filter(k => k.url.includes("cartocdn.com")).map(k => c.delete(k)))))
  .then(() => self.clients.claim())));

async function trimTiles() {
  const c = await caches.open(TILES), keys = await c.keys();
  for (let k = 0; k < keys.length - MAX_TILES; k++) await c.delete(keys[k]);
}
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (TILE_HOSTS.some(h => url.hostname.endsWith(h))) {
    // Tuile déjà gardée : servie tout de suite, et rafraîchie en arrière-plan si le réseau répond.
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then(r => { if (r.ok || r.type === "opaque") { c.put(e.request, r.clone()); trimTiles(); } return r; }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      return (await net) || new Response("", { status: 504 });
    }));
    return;
  }
  const isShell = url.origin === location.origin || url.hostname === "unpkg.com";
  if (!isShell) return; // météo, mer, débits, routes : toujours en direct
  // Réseau d'abord, mais au plus 5 s [P] quand une copie est gardée (22 nov. 2026) : sur la digue avec un réseau faible,
  // l'appli s'ouvrait seulement quand le navigateur abandonnait (parfois plus de 30 s). La réponse du réseau, si elle arrive,
  // remplace la copie pour la fois suivante.
  const net = fetch(e.request).then(r => { if (r.ok || r.type === "opaque") { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; });
  e.waitUntil(net.catch(() => { })); // appelé tout de suite (pas après un await), comme le veut le navigateur
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => !hit ? net
    : Promise.race([net.catch(() => hit), new Promise(r => setTimeout(() => r(hit), 5000))])));
});
