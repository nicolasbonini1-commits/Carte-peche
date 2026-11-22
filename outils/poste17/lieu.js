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
  // 1. OpenStreetMap : petites requêtes séparées (une grosse requête a déjà rendu 0 élément, LECONS 20 nov.).
  const q = {
    ouvrages: `[out:json][timeout:80];(nwr["man_made"~"^(lighthouse|groyne|breakwater|pier|dyke|embankment)$"](${bb});way["embankment"="yes"](${bb});nwr["seamark:type"](${bb}););out geom;`,
    noms: `[out:json][timeout:80];nwr["name"~"Véran|Veran|Beauduc|Dent|Faraman|Quenin|Sainte-Anne|Sablon|Courbe|Galère|Piémanson|Vaisseau|Gacholle|Sémaphore",i](${bb});out center tags;`,
    cote: `[out:json][timeout:80];way["natural"="coastline"](${bb});out geom;`,
    eau: `[out:json][timeout:80];(way["natural"="water"](${bb});way["natural"="wetland"]["name"](${bb}););out geom;relation["natural"="water"](${bb});out center tags;`,
    acces: `[out:json][timeout:80];(way["highway"](${bb});nwr["amenity"="parking"](${bb});node["barrier"](${bb}););out geom;`,
    protection: `[out:json][timeout:80];(nwr["boundary"="protected_area"](${bb});nwr["leisure"="nature_reserve"](${bb});nwr["boundary"="national_park"](${bb}););out center tags;`
  };
  const osm = {};
  for (const [k, v] of Object.entries(q)) { osm[k] = await overpass(k, v); await sleep(2000); }

  // 2. Points de vue : tout le secteur, puis la côte tous les ≈ 2,4 km (point du trait de côte le plus au sud à cette longitude).
  const pts = [];
  for (const w of osm.cote.elements || []) for (const g of w.geometry || []) pts.push(g);
  const vues = [["secteur", (BB[0] + BB[2]) / 2, (BB[1] + BB[3]) / 2, 26]];
  for (let lon = 4.53; lon <= 4.80; lon += 0.03) {
    const p = pts.filter(g => Math.abs(g.lon - lon) < 0.004).sort((a, b) => a.lat - b.lat)[0];
    if (p) vues.push([`cote_${lon.toFixed(2)}`, p.lat + 0.004, lon, 3.2]);
  }
  for (const e of osm.ouvrages.elements || []) if (e.tags && e.tags.man_made === "lighthouse") {
    const la = e.lat ?? e.bounds?.minlat, lo = e.lon ?? e.bounds?.minlon;
    if (la) vues.push([`phare_${(e.tags.name || e.id).toString().replace(/\W+/g, "_")}`, la, lo, 2]);
  }
  fs.writeFileSync(`${OUT}/vues.json`, JSON.stringify(vues));
  for (const [nom, la, lo, km] of vues) { await esri(nom, boite(la, lo, km)); await esriDate(nom, la, lo); }

  // 3. IGN : liste des couches d'orthophotos (dates), puis l'ortho actuelle et les anciennes sur les vues de côte.
  const cap = await get("https://data.geopf.fr/wms-r?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0", {}, 90000);
  let couches = [];
  if (cap.ok) {
    const x = cap.buf.toString();
    couches = [...x.matchAll(/<Name>(ORTHOIMAGERY\.ORTHOPHOTOS[^<]*)<\/Name>\s*<Title>([^<]*)<\/Title>/g)].map(m => ({ nom: m[1], titre: m[2] }));
    fs.writeFileSync(`${OUT}/ign_couches.json`, JSON.stringify(couches, null, 1));
  }
  const voulues = couches.map(c => c.nom).filter(n => /^ORTHOIMAGERY\.ORTHOPHOTOS(\.BDORTHO)?$|ORTHOPHOTOS20\d\d|ORTHOPHOTOS\.(19|20)\d\d|ORTHO-EXPRESS/.test(n)).slice(0, 6);
  fs.writeFileSync(`${OUT}/ign_voulues.json`, JSON.stringify(voulues));
  for (const [nom, la, lo, km] of vues.filter(v => (v[0].startsWith("cote_") && v[2] >= 4.555 && v[2] <= 4.685) || v[0].startsWith("phare_")))
    for (const c of voulues.length ? voulues : ["ORTHOIMAGERY.ORTHOPHOTOS"]) await ign(nom, c, boite(la, lo, km));

  fs.writeFileSync(`${OUT}/journal.json`, JSON.stringify(journal, null, 1));
  console.log(`${journal.length} requêtes ; échecs : ${journal.filter(j => j.erreur || j.code >= 400).length}`);
})();
