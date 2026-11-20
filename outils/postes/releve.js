// Chantier 1, étape 1 : relevé OpenStreetMap + profondeur EMODnet autour d'un poste, pour recaler sa position.
// Lancé par la tâche GitHub « postes » (branche chantier-1-postes) ; le chat ne peut pas joindre ces API.
// Usage : node outils/postes/releve.js 1 [2 4 …]  → écrit /tmp/sortie/poste_N.json
// Règles (LECONS.md, 20 nov.) : en-tête User-Agent obligatoire (Overpass répond 406 sans), serveurs de secours.
const fs = require("fs");
global.window = {};
require("../../js/spots.js");
const UA = "Carte-peche/1.0 (usage perso ; github.com/nicolasbonini1-commits/Carte-peche)";
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"];
const R = 2500;          // rayon de recherche OSM (m)
const PAS = 250, N = 9;  // grille de profondeur : 9 × 9 points tous les 250 m (2 km de côté)
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function overpass(q) {
  const erreurs = [];
  for (const url of OVERPASS) {
    try {
      const r = await fetch(url, { method: "POST", signal: AbortSignal.timeout(100000), headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(q) });
      if (!r.ok) { erreurs.push(`${url} → ${r.status}`); continue; }
      const j = await r.json();
      if (j.remark) erreurs.push(`${url} → remarque : ${j.remark}`);
      if (j.remark && !j.elements.length) continue;
      return { serveur: url, erreurs, ...j };
    } catch (e) { erreurs.push(`${url} → ${e.message}`); }
  }
  return { serveur: null, erreurs, elements: [] };
}

async function profondeur(lat, lon) {
  const url = `https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(${lon.toFixed(5)}%20${lat.toFixed(5)})`;
  for (let k = 0; k < 2; k++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { "User-Agent": UA } });
      if (!r.ok) { await sleep(1000); continue; }
      const j = await r.json();
      return { avg: j.avg ?? j.depth ?? j.mean ?? null, brut: j };
    } catch (e) { await sleep(1000); }
  }
  return { avg: null, erreur: true };
}

async function releve(id) {
  const s = window.SPOTS.find(x => x.id === id);
  const { lat, lon } = s;
  const dLat = R / 111320, dLon = R / (111320 * Math.cos(lat * Math.PI / 180));
  const bb = [lat - dLat, lon - dLon, lat + dLat, lon + dLon].map(v => v.toFixed(5)).join(",");
  const a = `(around:${R},${lat},${lon})`;
  // 20 nov. 19 h 10 : une seule grosse requête (avec les plans d'eau de Camargue) a rendu 0 élément → 3 petites requêtes.
  const R2 = 4000; const a2 = `(around:${R2},${lat},${lon})`;
  const reqs = {
    reperes: `[out:json][timeout:60];(node${a}["seamark:type"];way${a}["seamark:type"];way${a}["man_made"~"^(breakwater|groyne|pier)$"];nwr${a}["name"~"grau|embouchure|jetée|digue|épi|pointe|phare",i];);out geom(${bb});`,
    cote: `[out:json][timeout:60];way${a}["natural"="coastline"];out geom(${bb});`,
    fleuves: `[out:json][timeout:60];way${a2}["waterway"~"^(river|canal)$"];out geom;`
  };
  const osm = { serveur: [], erreurs: [], elements: [], osm3s: null };
  for (const [k, q] of Object.entries(reqs)) {
    const r = await overpass(q);
    osm.serveur.push(`${k}: ${r.serveur} (${r.elements.length})`); osm.erreurs.push(...r.erreurs);
    osm.elements.push(...r.elements); osm.osm3s = osm.osm3s || r.osm3s;
    await sleep(2000);
  }
  // Grille de profondeur centrée sur le point actuel.
  const grille = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const la = lat + (i - (N - 1) / 2) * PAS / 111320;
    const lo = lon + (j - (N - 1) / 2) * PAS / (111320 * Math.cos(lat * Math.PI / 180));
    const p = await profondeur(la, lo);
    grille.push({ lat: +la.toFixed(5), lon: +lo.toFixed(5), avg: p.avg, erreur: p.erreur || false });
    await sleep(150);
  }
  const ici = grille[(N * N - 1) / 2];
  return {
    poste: { id, name: s.name, lat, lon, pos: s.pos, type: s.type, seaward: s.seaward },
    date: new Date().toISOString(), sources: { osm: "© contributeurs OpenStreetMap (ODbL), via Overpass", profondeur: "EMODnet Bathymetry, depth_sample (MNT, maille ~115 m)" },
    overpass: { serveur: osm.serveur, erreurs: osm.erreurs, base: osm.osm3s && osm.osm3s.timestamp_osm_base, nb: osm.elements.length },
    profondeur_point_actuel: ici, grille, elements: osm.elements
  };
}

(async () => {
  const ids = process.argv.slice(2).map(Number);
  fs.mkdirSync("/tmp/sortie", { recursive: true });
  for (const id of ids) {
    const r = await releve(id);
    fs.writeFileSync(`/tmp/sortie/poste_${id}.json`, JSON.stringify(r, null, 1));
    const okGrille = r.grille.filter(g => !g.erreur).length, eau = r.grille.filter(g => g.avg != null).length;
    console.log(`poste ${id} : OSM ${r.overpass.nb} éléments (${r.overpass.serveur}) ${r.overpass.erreurs.join(" ; ")} | grille ${okGrille}/${r.grille.length} réponses, ${eau} avec profondeur | point actuel : ${JSON.stringify(r.profondeur_point_actuel.avg)}`);
  }
})();
