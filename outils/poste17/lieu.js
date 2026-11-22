// Poste 17 (candidat), étape 1 : confirmer le lieu de la vidéo Fada2pêche (loup 3,61 kg, févr. 2025).
// Hypothèse de Nico : digue frontale des anciens salins, de la pointe de Beauduc vers le grau de la Dent, épis de Faraman à l'est.
// Lancé par la tâche GitHub « poste17 » (branche essai-poste17) ; le chat ne peut joindre ni Overpass ni les photos aériennes.
// Écrit dans /tmp/sortie : osm_*.json, journal.json (heure de chaque requête, code, serveur), photos esri_*.jpg et ign_*.jpg.
// Règles LECONS.md : User-Agent + serveurs de secours (Overpass), délai sur chaque requête, heure notée à l'événement.
const fs = require("fs");
const OUT = "/tmp/sortie"; fs.mkdirSync(OUT, { recursive: true });
const UA = "Carte-peche/1.0 (usage perso ; github.com/nicolasbonini1-commits/Carte-peche)";
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"];
const BB = [43.33, 4.50, 43.43, 4.82]; // sud, ouest, nord, est : golfe de Beauduc → Piémanson
const bb = BB.join(",");
const journal = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => new Date().toISOString();

async function get(url, opts = {}, ms = 60000) {
  const t0 = Date.now(), debut = now();
  try {
    const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(ms), headers: { "User-Agent": UA, ...(opts.headers || {}) } });
    const buf = Buffer.from(await r.arrayBuffer());
    journal.push({ debut, fin: now(), s: (Date.now() - t0) / 1000, url: url.slice(0, 200), code: r.status, type: r.headers.get("content-type"), octets: buf.length });
    return { ok: r.ok, code: r.status, type: r.headers.get("content-type") || "", buf };
  } catch (e) {
    journal.push({ debut, fin: now(), s: (Date.now() - t0) / 1000, url: url.slice(0, 200), erreur: e.message });
    return { ok: false, erreur: e.message };
  }
}

async function overpass(nom, q) {
  for (let passe = 0; passe < 2; passe++) {
    if (passe) await sleep(45000);
    for (const url of OVERPASS) {
      const r = await get(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) }, 90000);
      if (!r.ok) continue;
      let j; try { j = JSON.parse(r.buf.toString()); } catch { continue; }
      if (j.remark && !(j.elements || []).length) continue;
      j.serveur = url; j.requete = q;
      fs.writeFileSync(`${OUT}/osm_${nom}.json`, JSON.stringify(j));
      return j;
    }
  }
  fs.writeFileSync(`${OUT}/osm_${nom}.json`, JSON.stringify({ echec: true, requete: q }));
  return { elements: [] };
}

// Photo aérienne Esri (World Imagery) sur une boîte [sud, ouest, nord, est].
async function esri(nom, b) {
  const url = `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${b[1]},${b[0]},${b[3]},${b[2]}&bboxSR=4326&imageSR=3857&size=1000,1000&format=jpg&f=image`;
  const r = await get(url, {}, 60000);
  if (r.ok && r.type.startsWith("image")) fs.writeFileSync(`${OUT}/esri_${nom}.jpg`, r.buf);
}
// Date des prises de vue Esri (service de métadonnées), brut.
async function esriDate(nom, lat, lon) {
  const ext = `${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}`;
  const urls = [
    `https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata/MapServer/identify?geometry=${lon},${lat}&geometryType=esriGeometryPoint&sr=4326&layers=all&tolerance=2&mapExtent=${ext}&imageDisplay=1000,1000,96&returnGeometry=false&f=json`,
    `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/identify?geometry=${lon},${lat}&geometryType=esriGeometryPoint&sr=4326&layers=all&tolerance=2&mapExtent=${ext}&imageDisplay=1000,1000,96&returnGeometry=false&f=json`];
  const res = [];
  for (const u of urls) { const r = await get(u, {}, 30000); res.push({ url: u.split("?")[0], code: r.code, texte: r.buf ? r.buf.toString().slice(0, 4000) : r.erreur }); }
  fs.writeFileSync(`${OUT}/esri_date_${nom}.json`, JSON.stringify(res, null, 1));
}
// Orthophotos IGN (Géoportail, WMS raster), couche datée.
async function ign(nom, couche, b) {
  const url = `https://data.geopf.fr/wms-r?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${couche}&STYLES=&CRS=EPSG:4326&BBOX=${b.join(",")}&WIDTH=800&HEIGHT=800&FORMAT=image/jpeg`;
  const r = await get(url, {}, 60000);
  if (r.ok && r.type.startsWith("image")) fs.writeFileSync(`${OUT}/ign_${nom}_${couche.replace(/[^A-Za-z0-9.-]/g, "_")}.jpg`, r.buf);
  else if (r.buf) fs.writeFileSync(`${OUT}/ign_${nom}_${couche}.erreur.txt`, r.buf.toString().slice(0, 2000));
}
const boite = (lat, lon, km) => { const dl = km / 2 / 111.32, dL = km / 2 / (111.32 * Math.cos(lat * Math.PI / 180)); return [lat - dl, lon - dL, lat + dl, lon + dL]; };

(async () => {
  // Passe 2 (22 nov. 16 h 30) : la passe 1 a eu 0 réponse d'Overpass en 39 min (overpass-api.de « fetch failed » en 0,2 s,
  // les 2 autres en délai dépassé). On passe par l'API officielle d'OpenStreetMap (requête « map », boîtes < 0,25 deg²).
  const osmBoites = [[43.345, 4.555, 43.385, 4.600], [43.340, 4.595, 43.375, 4.640], [43.335, 4.635, 43.370, 4.680], [43.335, 4.675, 43.370, 4.720], [43.335, 4.715, 43.370, 4.770]];
  for (const [i, b] of osmBoites.entries()) {
    const r = await get(`https://api.openstreetmap.org/api/0.6/map?bbox=${b[1]},${b[0]},${b[3]},${b[2]}`, {}, 120000);
    fs.writeFileSync(`${OUT}/osm_map_${i}.xml`, r.buf ? r.buf : (r.erreur || "échec"));
    await sleep(2000);
  }
  // Nominatim (1 requête/s max) : lieux nommés.
  for (const n of ["Phare de Beauduc", "Grau de la Dent", "Phare de Faraman", "Étang de Beauduc", "Digue de Véran", "Plage de Beauduc", "Baisse de Quenin"]) {
    const r = await get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(n + ", Arles")}&format=jsonv2&limit=5&extratags=1`, {}, 30000);
    fs.writeFileSync(`${OUT}/nominatim_${n.replace(/\W+/g, "_")}.json`, r.buf ? r.buf : (r.erreur || "échec"));
    await sleep(1500);
  }
  // Vues rapprochées le long de la côte (centres lus sur la photo Esri du secteur de la passe 1, à ± 500 m) : 2,4 km de côté.
  const vues = [["phare_beauduc", 43.3647, 4.5846, 2.4]];
  const cote = { 4.56: 43.385, 4.58: 43.366, 4.60: 43.360, 4.62: 43.356, 4.64: 43.352, 4.66: 43.350, 4.68: 43.350, 4.70: 43.351, 4.72: 43.353, 4.74: 43.355, 4.76: 43.356 };
  for (const [lo, la] of Object.entries(cote)) vues.push([`cote_${(+lo).toFixed(2)}`, la + 0.003, +lo, 2.4]);
  fs.writeFileSync(`${OUT}/vues.json`, JSON.stringify(vues));
  for (const [nom, la, lo, km] of vues) { await esri(nom, boite(la, lo, km)); await esriDate(nom, la, lo); }
  // IGN : mêmes vues de 4,58 à 4,68 (hypothèse de Nico), 5 dates pour voir l'état de la digue avant/après les effondrements.
  const couches = ["ORTHOIMAGERY.ORTHOPHOTOS2012", "ORTHOIMAGERY.ORTHOPHOTOS2018", "ORTHOIMAGERY.ORTHOPHOTOS2024", "ORTHOIMAGERY.ORTHOPHOTOS.ORTHO-EXPRESS.2025", "ORTHOIMAGERY.ORTHOPHOTOS"];
  for (const [nom, la, lo, km] of vues.filter(v => v[2] >= 4.575 && v[2] <= 4.685))
    for (const c of couches) await ign(nom, c, boite(la, lo, km));
  // Date de l'ortho IGN actuelle (GetFeatureInfo, brut).
  const b = boite(43.36, 4.62, 2.4);
  const fi = await get(`https://data.geopf.fr/wms-r?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=ORTHOIMAGERY.ORTHOPHOTOS&QUERY_LAYERS=ORTHOIMAGERY.ORTHOPHOTOS&STYLES=&CRS=EPSG:4326&BBOX=${b.join(",")}&WIDTH=800&HEIGHT=800&I=400&J=400&INFO_FORMAT=text/html`, {}, 30000);
  fs.writeFileSync(`${OUT}/ign_date_actuelle.txt`, fi.buf ? fi.buf.toString().slice(0, 5000) : (fi.erreur || ""));

  fs.writeFileSync(`${OUT}/journal.json`, JSON.stringify(journal, null, 1));
  console.log(`${journal.length} requêtes ; échecs : ${journal.filter(j => j.erreur || j.code >= 400).length}`);
})();
