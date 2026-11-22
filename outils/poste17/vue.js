// Poste 17, étape 3 (suite) : vue d'ensemble pour l'image de contrôle (parking de Beauduc → P, chemin réel calculé dans le chat
// sur les chemins OSM publics + la plage), et date brute des photos Esri (le passage 17 h 19 n'a pas su lire la réponse).
// Écrit dans /tmp/sortie : esri_ensemble.jpg (+ boîte), ign_ensemble.jpg, esri_date_brut_*.json, journal.json.
const fs = require("fs");
const OUT = "/tmp/sortie"; fs.mkdirSync(OUT, { recursive: true });
const UA = "Carte-peche/1.0 (usage perso ; github.com/nicolasbonini1-commits/Carte-peche)";
const journal = [];
const now = () => new Date().toISOString();
const rad = d => d * Math.PI / 180;
async function get(url, ms = 90000) {
  const t0 = Date.now(), debut = now();
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { "User-Agent": UA } });
    const buf = Buffer.from(await r.arrayBuffer());
    journal.push({ debut, fin: now(), s: (Date.now() - t0) / 1000, url: url.slice(0, 220), code: r.status, type: r.headers.get("content-type"), octets: buf.length });
    return { ok: r.ok, type: r.headers.get("content-type") || "", buf };
  } catch (e) { journal.push({ debut, fin: now(), s: (Date.now() - t0) / 1000, url: url.slice(0, 220), erreur: e.message }); return { ok: false }; }
}
const merc = (lat, lon) => [rad(lon) * 6378137, Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2)) * 6378137];
(async () => {
  const B = [43.355, 4.548, 43.412, 4.603]; // sud, ouest, nord, est
  const [x0, y0] = merc(B[0], B[1]), [x1, y1] = merc(B[2], B[3]);
  const w = 2000, h = Math.round(w * (y1 - y0) / (x1 - x0));
  const r = await get(`https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${x0},${y0},${x1},${y1}&bboxSR=3857&imageSR=3857&size=${w},${h}&format=jpg&f=image`);
  if (r.ok && r.type.startsWith("image")) { fs.writeFileSync(`${OUT}/esri_ensemble.jpg`, r.buf); fs.writeFileSync(`${OUT}/esri_ensemble.boite.json`, JSON.stringify({ boite: B, taille: [w, h] })); }
  const g = await get(`https://data.geopf.fr/wms-r?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ORTHOIMAGERY.ORTHOPHOTOS&STYLES=&CRS=EPSG:4326&BBOX=${B.join(",")}&WIDTH=1600&HEIGHT=${Math.round(1600 * (B[2] - B[0]) / ((B[3] - B[1]) * Math.cos(rad(43.38))))}&FORMAT=image/jpeg`);
  if (g.ok && g.type.startsWith("image")) fs.writeFileSync(`${OUT}/ign_ensemble.jpg`, g.buf);
  for (const [nom, la, lo] of [["P", 43.36147, 4.59261], ["c", 43.35706, 4.60021], ["parking", 43.40731, 4.59691]]) {
    const ext = `${lo - 0.005},${la - 0.005},${lo + 0.005},${la + 0.005}`;
    const d = await get(`https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata/MapServer/identify?geometry=${lo},${la}&geometryType=esriGeometryPoint&sr=4326&layers=all&tolerance=2&mapExtent=${ext}&imageDisplay=1000,1000,96&returnGeometry=false&f=json`, 30000);
    fs.writeFileSync(`${OUT}/esri_date_brut_${nom}.json`, d.buf ? d.buf.toString().slice(0, 6000) : "échec");
  }
  fs.writeFileSync(`${OUT}/journal.json`, JSON.stringify(journal, null, 1));
  console.log(`${journal.length} requêtes ; échecs : ${journal.filter(j => j.erreur || j.code >= 400).length}`);
})();
