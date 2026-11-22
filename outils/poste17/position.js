// Poste 17 (candidat Beauduc), étape 3 : position sourcée + points « autour » + parking + chemin réel.
// Lancé par la tâche GitHub « poste17 » (branche essai-poste17) ; le chat ne peut joindre ni l'API OSM, ni EMODnet, ni Esri.
// Overpass injoignable (étape 1) → API officielle OSM (/api/0.6/map) pour la boîte nord (parking, cabanons, pistes).
// Points proposés (lus sur la photo Esri du 25 mars 2025, vue « phare_beauduc », à ± 20 m, contrôlés ici en vue rapprochée) :
//   P = rive ouest du grau qui fait communiquer l'étang de Beauduc avec la mer (côté phare : pas d'eau à traverser) ;
//   a = racine de l'ancienne digue frontale sous le phare ; b = plage face à la ligne de blocs ;
//   c = jonction blocs / rivage, rive EST du grau (à écarter si le grau ne se traverse pas) ; blocs = milieu de la ligne de blocs.
// Écrit dans /tmp/sortie : osm_nord.xml, parkings.json, routes.json, profondeurs.json, esri_*.jpg (+ boîte), ign_*.jpg, journal.json.
// Règles LECONS.md : User-Agent, délai sur chaque requête, heure de chaque requête notée à l'événement.
const fs = require("fs");
const OUT = "/tmp/sortie"; fs.mkdirSync(OUT, { recursive: true });
const UA = "Carte-peche/1.0 (usage perso ; github.com/nicolasbonini1-commits/Carte-peche)";
const journal = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => new Date().toISOString();
const rad = d => d * Math.PI / 180;
const dist = (a, b) => 6371000 * Math.hypot(rad(b.lon - a.lon) * Math.cos(rad((a.lat + b.lat) / 2)), rad(b.lat - a.lat));
const deplace = (p, cap, m) => ({ lat: p.lat + m * Math.cos(rad(cap)) / 111320, lon: p.lon + m * Math.sin(rad(cap)) / (111320 * Math.cos(rad(p.lat))) });

const POINTS = [
  { id: "P", nom: "Grau de l'étang de Beauduc, rive ouest", lat: 43.36147, lon: 4.59261 },
  { id: "a", nom: "Racine de l'ancienne digue, sous le phare", lat: 43.36206, lon: 4.58453 },
  { id: "b", nom: "Plage face à la ligne de blocs", lat: 43.36179, lon: 4.58875 },
  { id: "c", nom: "Jonction blocs / rivage, rive est du grau", lat: 43.35706, lon: 4.60021 },
  { id: "blocs", nom: "Ligne de blocs, milieu", lat: 43.35942, lon: 4.59201 }
];
const MER = 215; // direction du large (côte orientée ≈ 125° entre le phare et la jonction, lue sur OSM)

async function get(url, opts = {}, ms = 60000) {
  const t0 = Date.now(), debut = now();
  try {
    const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(ms), headers: { "User-Agent": UA, ...(opts.headers || {}) } });
    const buf = Buffer.from(await r.arrayBuffer());
    journal.push({ debut, fin: now(), s: (Date.now() - t0) / 1000, url: url.slice(0, 220), code: r.status, type: r.headers.get("content-type"), octets: buf.length });
    return { ok: r.ok, code: r.status, type: r.headers.get("content-type") || "", buf };
  } catch (e) {
    journal.push({ debut, fin: now(), s: (Date.now() - t0) / 1000, url: url.slice(0, 220), erreur: e.message });
    return { ok: false, erreur: e.message };
  }
}

// Lecture minimale du XML OSM : nœuds (lat, lon, tags) et chemins (refs, tags).
function lireOSM(xml) {
  const nodes = new Map(), ways = [];
  for (const m of xml.matchAll(/<node ([^>]*?)(\/>|>([\s\S]*?)<\/node>)/g)) {
    const at = Object.fromEntries([...m[1].matchAll(/(\w+)="([^"]*)"/g)].map(x => [x[1], x[2]]));
    const tags = Object.fromEntries([...(m[3] || "").matchAll(/<tag k="([^"]*)" v="([^"]*)"/g)].map(x => [x[1], x[2]]));
    nodes.set(at.id, { id: at.id, lat: +at.lat, lon: +at.lon, tags });
  }
  for (const m of xml.matchAll(/<way ([^>]*?)>([\s\S]*?)<\/way>/g)) {
    const id = /id="(\d+)"/.exec(m[1])[1];
    const refs = [...m[2].matchAll(/<nd ref="(\d+)"/g)].map(x => x[1]);
    const tags = Object.fromEntries([...m[2].matchAll(/<tag k="([^"]*)" v="([^"]*)"/g)].map(x => [x[1], x[2]]));
    ways.push({ id, refs, tags });
  }
  return { nodes, ways };
}

// Photo Esri World Imagery : boîte [sud, ouest, nord, est], taille calculée pour garder exactement la boîte (Mercator).
const merc = (lat, lon) => [rad(lon) * 6378137, Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2)) * 6378137];
async function esri(nom, b, large = 1000) {
  const [x0, y0] = merc(b[0], b[1]), [x1, y1] = merc(b[2], b[3]);
  const w = large, h = Math.round(large * (y1 - y0) / (x1 - x0));
  const url = `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${x0},${y0},${x1},${y1}&bboxSR=3857&imageSR=3857&size=${w},${h}&format=jpg&f=image`;
  const r = await get(url, {}, 90000);
  if (r.ok && r.type.startsWith("image")) { fs.writeFileSync(`${OUT}/esri_${nom}.jpg`, r.buf); fs.writeFileSync(`${OUT}/esri_${nom}.boite.json`, JSON.stringify({ boite: b, taille: [w, h] })); }
}
async function esriDate(nom, p) {
  const ext = `${p.lon - 0.005},${p.lat - 0.005},${p.lon + 0.005},${p.lat + 0.005}`;
  const u = `https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata/MapServer/identify?geometry=${p.lon},${p.lat}&geometryType=esriGeometryPoint&sr=4326&layers=all&tolerance=2&mapExtent=${ext}&imageDisplay=1000,1000,96&returnGeometry=false&f=json`;
  const r = await get(u, {}, 30000);
  let dates = null;
  try { dates = JSON.parse(r.buf.toString()).results.map(x => ({ couche: x.layerName, date: x.attributes.SRC_DATE2 || x.attributes.SRC_DATE, resolution: x.attributes.SRC_RES, source: x.attributes.NICE_DESC || x.attributes.SRC_DESC })); } catch { dates = r.erreur || r.code; }
  return dates;
}
async function ign(nom, b) {
  const url = `https://data.geopf.fr/wms-r?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ORTHOIMAGERY.ORTHOPHOTOS&STYLES=&CRS=EPSG:4326&BBOX=${b.join(",")}&WIDTH=1000&HEIGHT=1000&FORMAT=image/jpeg`;
  const r = await get(url, {}, 60000);
  if (r.ok && r.type.startsWith("image")) fs.writeFileSync(`${OUT}/ign_${nom}.jpg`, r.buf);
}
const boiteM = (p, m) => { const dl = m / 2 / 111320, dL = m / 2 / (111320 * Math.cos(rad(p.lat))); return [p.lat - dl, p.lon - dL, p.lat + dl, p.lon + dL]; };

async function profondeur(p) {
  const r = await get(`https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(${p.lon.toFixed(5)}%20${p.lat.toFixed(5)})`, {}, 20000);
  await sleep(200);
  try { const j = JSON.parse(r.buf.toString()); const v = j.avg ?? j.depth ?? j.mean; return v == null ? null : +(+v).toFixed(2); } catch { return null; }
}
// Routeur piéton FOSSGIS (OSRM, profil foot, chemins OSM seulement : il ne marche pas sur le sable non cartographié).
async function aPied(a, b) {
  const r = await get(`https://routing.openstreetmap.de/routed-foot/route/v1/driving/${a.lon.toFixed(6)},${a.lat.toFixed(6)};${b.lon.toFixed(6)},${b.lat.toFixed(6)}?overview=full&geometries=geojson&steps=false`, {}, 30000);
  await sleep(1100);
  try {
    const j = JSON.parse(r.buf.toString());
    if (j.code !== "Ok") return { erreur: j.code };
    const t = j.routes[0];
    return { metres: Math.round(t.distance), minutes: Math.round(t.duration / 60), accroche: j.waypoints.map(w => Math.round(w.distance)),
      trace: t.geometry.coordinates.map(([lo, la]) => [+la.toFixed(6), +lo.toFixed(6)]) };
  } catch { return { erreur: r.erreur || r.code }; }
}

(async () => {
  // 1. OSM, boîte nord : cabanons et parking de Beauduc, piste depuis Salin-de-Giraud, sentiers vers la plage.
  const NORD = [43.375, 4.53, 43.425, 4.63];
  const r = await get(`https://api.openstreetmap.org/api/0.6/map?bbox=${NORD[1]},${NORD[0]},${NORD[3]},${NORD[2]}`, {}, 180000);
  const xml = r.buf ? r.buf.toString() : "";
  fs.writeFileSync(`${OUT}/osm_nord.xml`, xml || (r.erreur || "échec"));
  const { nodes, ways } = lireOSM(xml);
  const parkings = [];
  for (const n of nodes.values()) if (n.tags.amenity === "parking") parkings.push({ osm: "node/" + n.id, lat: n.lat, lon: n.lon, tags: n.tags });
  for (const w of ways) if (w.tags.amenity === "parking") {
    const pts = w.refs.map(id => nodes.get(id)).filter(Boolean);
    if (!pts.length) continue;
    parkings.push({ osm: "way/" + w.id, lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lon: pts.reduce((s, p) => s + p.lon, 0) / pts.length, tags: w.tags });
  }
  // Repères nommés de la boîte (pour retrouver « Beauduc » même sans parking cartographié).
  const noms = [...nodes.values()].filter(n => n.tags.name || n.tags.place).map(n => ({ osm: "node/" + n.id, lat: n.lat, lon: n.lon, tags: n.tags }));
  const P = POINTS[0];
  parkings.forEach(k => k.vol_P = Math.round(dist(k, P)));
  parkings.sort((x, y) => x.vol_P - y.vol_P);
  fs.writeFileSync(`${OUT}/parkings.json`, JSON.stringify({ boite: NORD, parkings, noms }, null, 1));

  // 2. Chemin réel : routeur piéton depuis les 3 parkings les plus proches vers P et vers a ; puis entre les points.
  const routes = {};
  for (const k of parkings.slice(0, 3)) for (const p of [P, POINTS[1]]) routes[`${k.osm}→${p.id}`] = await aPied(k, p);
  for (const p of POINTS.slice(1)) routes[`P→${p.id}`] = await aPied(P, p);
  fs.writeFileSync(`${OUT}/routes.json`, JSON.stringify(routes, null, 1));

  // 3. Profondeur EMODnet (maille ≈ 115 m) au point et vers le large (cap 215°).
  const prof = {};
  for (const p of POINTS) {
    prof[p.id] = { ici: await profondeur(p) };
    for (const m of [50, 100, 200, 300, 500]) prof[p.id][`large_${m}m`] = await profondeur(deplace(p, MER, m));
  }
  fs.writeFileSync(`${OUT}/profondeurs.json`, JSON.stringify({ source: "EMODnet Bathymetry depth_sample, maille ≈ 115 m", cap_large: MER, prof }, null, 1));

  // 4. Photos : vue rapprochée (600 m, ≈ 0,6 m/pixel) de chaque point et des parkings, date Esri ; IGN en second regard.
  const dates = {};
  for (const p of POINTS) { await esri(p.id, boiteM(p, 600)); dates[p.id] = await esriDate(p.id, p); await ign(p.id, boiteM(p, 600)); }
  for (const [i, k] of parkings.slice(0, 3).entries()) { await esri(`parking${i}`, boiteM(k, 600)); dates[`parking${i}`] = await esriDate(`parking${i}`, k); }
  // Vue d'ensemble : parkings + points + traces, marge 300 m, 2000 pixels de large.
  const tous = [...POINTS, ...parkings.slice(0, 3)];
  for (const t of Object.values(routes)) if (t.trace) t.trace.forEach(([la, lo]) => tous.push({ lat: la, lon: lo }));
  const m = 300 / 111320;
  const B = [Math.min(...tous.map(p => p.lat)) - m, Math.min(...tous.map(p => p.lon)) - m * 1.4, Math.max(...tous.map(p => p.lat)) + m, Math.max(...tous.map(p => p.lon)) + m * 1.4];
  await esri("ensemble", B, 2000);
  fs.writeFileSync(`${OUT}/esri_dates.json`, JSON.stringify(dates, null, 1));
  fs.writeFileSync(`${OUT}/points.json`, JSON.stringify(POINTS, null, 1));
  fs.writeFileSync(`${OUT}/journal.json`, JSON.stringify(journal, null, 1));
  console.log(`${journal.length} requêtes ; échecs : ${journal.filter(j => j.erreur || j.code >= 400).length} ; parkings OSM : ${parkings.length}`);
})();
