// Chantier 1, étape 1 (21 nov. 2026, nuit) : contrôle des points proposés pour un poste (P = principal, a/b/c… = « autour »).
// Lancé par la tâche GitHub « postes » ; le chat ne peut pas joindre ces API.
// Usage : node outils/postes/verifier.js 8 [9 …]  → écrit /tmp/sortie/verif_N.json
// Points lus dans outils/postes/candidats.json (poste en cours de relevé) sinon dans js/spots.js (poste déjà validé).
//
// Ce qui est calculé pour chaque point :
// 1. Distance à pied depuis P (routeur piéton OSRM de FOSSGIS sur les chemins OpenStreetMap, routing.openstreetmap.de).
//    Règle de Nico (20 nov. 22 h 34) : un point « autour » doit être joignable à pied depuis le poste.
//    Seuils proposés [P], à valider par Nico : « à écarter » si le trajet à pied dépasse 1 500 m,
//    ou s'il fait plus de 2 fois la distance à vol d'oiseau avec un détour de plus de 400 m
//    (le détour minimum évite d'écarter deux épis à 150 m l'un de l'autre reliés par 350 m de promenade).
//    « accroche » = distance entre le point et le chemin OSM le plus proche (sable, enrochements : pas de chemin) ;
//    au-delà de 150 m, le point est signalé (le routeur ne sait pas y aller : à vérifier sur la carte satellite).
//    Le détour est mesuré entre les deux accroches (sur les chemins), la marche totale = accroches + trajet.
// 2. Marche d'approche : distance à pied depuis le parking OSM le plus proche (à vol d'oiseau) jusqu'à P.
// 3. Profondeur EMODnet au point et à 100, 200 et 300 m vers le large (direction « seaward » du poste).
// 4. Éléments OSM utiles autour de P (1,5 km) : parkings, ponts, casino, postes de secours, pêche autorisée ou non, trait de côte.
const fs = require("fs");
global.window = {};
require("../../js/spots.js");
const UA = "Carte-peche/1.0 (usage perso ; github.com/nicolasbonini1-commits/Carte-peche)";
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rad = d => d * Math.PI / 180;
function dist(a, b) {
  const x = rad(b.lon - a.lon) * Math.cos(rad((a.lat + b.lat) / 2)), y = rad(b.lat - a.lat);
  return 6371000 * Math.hypot(x, y);
}
function cap(a, b) {
  const x = rad(b.lon - a.lon) * Math.cos(rad((a.lat + b.lat) / 2)), y = rad(b.lat - a.lat);
  return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
}
function deplace(p, capDeg, m) {
  return { lat: p.lat + m * Math.cos(rad(capDeg)) / 111320, lon: p.lon + m * Math.sin(rad(capDeg)) / (111320 * Math.cos(rad(p.lat))) };
}

async function getJSON(url, opts = {}, essais = 3) {
  let err;
  for (let k = 0; k < essais; k++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(opts.timeout || 30000), headers: { "User-Agent": UA, ...(opts.headers || {}) }, method: opts.method, body: opts.body });
      if (r.ok) return await r.json();
      err = `HTTP ${r.status}`;
    } catch (e) { err = e.message; }
    await sleep(2000 * (k + 1));
  }
  return { erreur: err };
}

async function overpass(q) {
  const erreurs = [];
  for (let passe = 0; passe < 2; passe++) {
    if (passe) await sleep(45000);
    for (const url of OVERPASS) {
      const j = await getJSON(url, { method: "POST", timeout: 70000, headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) }, 1);
      if (j.erreur) { erreurs.push(`${url} → ${j.erreur}`); continue; }
      if (j.remark && !(j.elements || []).length) { erreurs.push(`${url} → ${j.remark}`); continue; }
      return { serveur: url, erreurs, elements: j.elements || [] };
    }
  }
  return { serveur: null, erreurs, elements: [] };
}

// Routeur piéton FOSSGIS (profil « foot » ; le chemin de l'URL garde « driving », c'est la convention OSRM).
async function aPied(a, b) {
  const url = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${a.lon.toFixed(6)},${a.lat.toFixed(6)};${b.lon.toFixed(6)},${b.lat.toFixed(6)}?overview=full&geometries=geojson`;
  const j = await getJSON(url, { timeout: 30000 });
  await sleep(1100); // politesse : ≤ 1 requête par seconde
  if (j.erreur || j.code !== "Ok" || !j.routes || !j.routes.length) return { erreur: j.erreur || j.code || "pas de trajet" };
  const r = j.routes[0];
  return {
    pied: Math.round(r.distance), minutes: Math.round(r.duration / 60),
    accroche: j.waypoints.map(w => Math.round(w.distance)), // distance point → chemin OSM le plus proche (m)
    accroches: j.waypoints.map(w => ({ lat: w.location[1], lon: w.location[0] })), // où le routeur rejoint les chemins
    trace: r.geometry.coordinates.map(([lo, la]) => [+la.toFixed(5), +lo.toFixed(5)])
  };
}

async function profondeur(p) {
  const url = `https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(${p.lon.toFixed(5)}%20${p.lat.toFixed(5)})`;
  const j = await getJSON(url, { timeout: 20000 }, 2);
  await sleep(150);
  if (j.erreur) return null;
  const v = j.avg ?? j.depth ?? j.mean ?? null;
  return v == null ? null : +(+v).toFixed(1);
}

// Le détour se mesure entre les deux points où le routeur rejoint les chemins OSM (« accroches ») : on ne compte pas
// comme détour la marche sur le sable ou sur l'épi, qui n'est pas cartographiée comme chemin.
function verdict(vol, r) {
  if (r.erreur) return { avis: "inconnu", pourquoi: "routeur sans réponse : " + r.erreur, notes: [] };
  const entre = Math.max(dist(r.accroches[0], r.accroches[1]), 1);
  const total = r.pied + r.accroche[0] + r.accroche[1];
  const ratio = r.pied / entre, detour = r.pied - entre;
  const notes = [];
  r.accroche.forEach((a, i) => { if (a > 150) notes.push(`${i ? "point" : "P"} à ${a} m du chemin OSM le plus proche : accès réel à vérifier sur la photo aérienne`); });
  const base = `${total} m à pied (≈ ${Math.round(total / 75)} min, dont ${r.accroche[0] + r.accroche[1]} m hors chemin) pour ${Math.round(vol)} m à vol d'oiseau`;
  if (total > 1500) return { avis: "à écarter", total, ratio: +ratio.toFixed(1), pourquoi: base + " : plus de 1 500 m", notes };
  if (ratio > 2 && detour > 400) return { avis: "à écarter", total, ratio: +ratio.toFixed(1), pourquoi: base + ` : sur les chemins, ${r.pied} m pour ${Math.round(entre)} m en ligne droite (${ratio.toFixed(1)} fois) : un obstacle (chenal, port, étang) à contourner`, notes };
  return { avis: "joignable", total, ratio: +ratio.toFixed(1), pourquoi: base, notes };
}

async function verifier(id, cands) {
  const s = window.SPOTS.find(x => x.id === id);
  let pts = cands[id];
  let origine = "candidats.json";
  if (!pts || !pts.length) {
    origine = "js/spots.js";
    pts = [{ label: "P", name: s.name, lat: s.lat, lon: s.lon, src: s.pos }, ...(s.autour || []).map((a, i) => ({ label: "abcdefgh"[i], ...a }))];
  }
  const P = pts.find(p => p.label === "P") || pts[0];
  const seaward = P.seaward ?? s.seaward;
  const out = { poste: { id, name: s.name, seaward, actuel: { lat: s.lat, lon: s.lon } }, origine, date: new Date().toISOString(),
    sources: { pied: "routeur OSRM profil piéton, FOSSGIS (routing.openstreetmap.de), données © contributeurs OpenStreetMap (ODbL)",
      profondeur: "EMODnet Bathymetry, depth_sample (maille ~115 m)", osm: "© contributeurs OpenStreetMap (ODbL), via Overpass" },
    points: [], acces: null, approche: null };
  for (const p of pts) {
    const q = { ...p };
    q.profondeur = { ici: await profondeur(p) };
    for (const m of [100, 200, 300]) q.profondeur[m + "m"] = await profondeur(deplace(p, seaward, m));
    if (p !== P) {
      q.vol = Math.round(dist(P, p)); q.cap = Math.round(cap(P, p));
      q.trajet = await aPied(P, p);
      q.verdict = verdict(q.vol, q.trajet);
    }
    out.points.push(q);
  }
  // Éléments utiles autour de P (1,5 km)
  const a = `(around:1500,${P.lat},${P.lon})`;
  const qa = `[out:json][timeout:60];(nwr${a}["amenity"~"^(parking|casino)$"];way${a}["highway"]["bridge"="yes"];nwr${a}["leisure"="fishing"];nwr${a}["fishing"];node${a}["emergency"~"lifeguard"];way${a}["man_made"~"^(breakwater|groyne|pier)$"]["access"];);out center tags;`;
  const r = await overpass(qa);
  out.acces = { serveur: r.serveur, erreurs: r.erreurs, elements: r.elements.map(e => ({ type: e.type, id: e.id, lat: e.lat ?? (e.center && e.center.lat), lon: e.lon ?? (e.center && e.center.lon), tags: e.tags })) };
  await sleep(2000);
  const rc = await overpass(`[out:json][timeout:60];way(around:1500,${P.lat},${P.lon})["natural"="coastline"];out geom;`);
  out.cote = { serveur: rc.serveur, erreurs: rc.erreurs, elements: rc.elements };
  // Marche d'approche depuis le parking le plus proche (à vol d'oiseau)
  const parks = out.acces.elements.filter(e => e.tags && e.tags.amenity === "parking" && e.lat != null)
    .map(e => ({ ...e, d: dist(P, e) })).sort((x, y) => x.d - y.d).slice(0, 3);
  out.approche = [];
  for (const k of parks) {
    const t = await aPied({ lat: k.lat, lon: k.lon }, P);
    out.approche.push({ parking: { id: `${k.type}/${k.id}`, lat: k.lat, lon: k.lon, nom: k.tags.name || null, acces: k.tags.access || null, payant: k.tags.fee || null }, vol: Math.round(k.d), trajet: t });
  }
  return out;
}

(async () => {
  const ids = process.argv.slice(2).map(Number);
  let cands = {};
  try { cands = JSON.parse(fs.readFileSync(__dirname + "/candidats.json", "utf8") || "{}"); } catch (e) { }
  fs.mkdirSync("/tmp/sortie", { recursive: true });
  for (const id of ids) {
    const r = await verifier(id, cands);
    fs.writeFileSync(`/tmp/sortie/verif_${id}.json`, JSON.stringify(r, null, 1));
    console.log(`poste ${id} (${r.origine}) :`);
    for (const p of r.points) console.log(`  ${p.label} ${p.name || ""} prof ${JSON.stringify(p.profondeur)} ${p.verdict ? `→ ${p.verdict.avis} : ${p.verdict.pourquoi} ${p.verdict.notes.join(" ; ")}` : "(principal)"}`);
    for (const a of r.approche) console.log(`  parking ${a.parking.id} ${a.parking.nom || ""} : ${a.trajet.pied ?? a.trajet.erreur} m à pied jusqu'à P`);
    console.log(`  OSM accès : ${r.acces.elements.length} éléments (${r.acces.serveur}) ; côte : ${r.cote.elements.length} ; erreurs : ${[...r.acces.erreurs, ...r.cote.erreurs].join(" ; ")}`);
  }
})().catch(e => { console.error(e); process.exit(1); });
