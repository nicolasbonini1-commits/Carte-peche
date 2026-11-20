// Chantier 1 (21 nov. 2026, nuit) : poste « zone » (poste 3, rivage sauvage Petit Rhône – Espiguette, ≈ 15 km de plage).
// Un point au milieu d'une plage de 15 km ne sert à rien : on cherche par où on arrive vraiment au bord de l'eau.
// Relevé OpenStreetMap sur la bande côtière : trait de côte, routes, pistes et sentiers qui finissent près de la mer
// (avec leurs restrictions d'accès), parkings, espaces protégés, lieux-dits. + profondeur EMODnet le long de la côte.
// Usage : node outils/postes/zone.js 3  → /tmp/sortie/zone_3.json
const fs = require("fs");
const UA = "Carte-peche/1.0 (usage perso ; github.com/nicolasbonini1-commits/Carte-peche)";
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"];
const ZONES = { 3: { bbox: [43.430, 4.115, 43.505, 4.400], nom: "Rivage Petit Rhône – Espiguette" } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rad = d => d * Math.PI / 180;
const xy = p => [rad(p.lon) * Math.cos(rad(43.47)) * 6371000, rad(p.lat) * 6371000];
function dSeg(p, a, b) {
  const [px, py] = xy(p), [ax, ay] = xy(a), [bx, by] = xy(b), dx = bx - ax, dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
async function overpass(q) {
  const erreurs = [];
  for (let passe = 0; passe < 3; passe++) {
    if (passe) await sleep(45000);
    for (const url of OVERPASS) {
      try {
        const r = await fetch(url, { method: "POST", signal: AbortSignal.timeout(90000), headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) });
        if (!r.ok) { erreurs.push(`${url} → ${r.status}`); continue; }
        const j = await r.json();
        if (j.remark && !j.elements.length) { erreurs.push(`${url} → ${j.remark}`); continue; }
        return { serveur: url, erreurs, elements: j.elements };
      } catch (e) { erreurs.push(`${url} → ${e.message}`); }
    }
  }
  return { serveur: null, erreurs, elements: [] };
}
async function profondeur(p) {
  try {
    const r = await fetch(`https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(${p.lon.toFixed(5)}%20${p.lat.toFixed(5)})`, { signal: AbortSignal.timeout(20000), headers: { "User-Agent": UA } });
    if (!r.ok) return null; const j = await r.json(); const v = j.avg ?? j.depth ?? null; return v == null ? null : +(+v).toFixed(1);
  } catch (e) { return null; }
}
(async () => {
  const id = +process.argv[2], Z = ZONES[id];
  const bb = Z.bbox.join(",");
  const reqs = {
    cote: `[out:json][timeout:90];way["natural"="coastline"](${bb});out geom;`,
    chemins: `[out:json][timeout:90];way["highway"~"^(track|path|footway|unclassified|service|tertiary|secondary|residential|bridleway|cycleway)$"](${bb});out geom tags;`,
    parkings: `[out:json][timeout:60];nwr["amenity"="parking"](${bb});out center tags;`,
    protege: `[out:json][timeout:60];(way["boundary"="protected_area"](${bb});relation["boundary"="protected_area"](${bb});way["leisure"="nature_reserve"](${bb});relation["leisure"="nature_reserve"](${bb}););out tags center;`,
    lieux: `[out:json][timeout:60];(node["place"](${bb});node["natural"~"beach|cape"](${bb});way["natural"="beach"](${bb});node["tourism"~"camp_site|viewpoint"](${bb});node["seamark:type"](${bb});way["man_made"~"groyne|breakwater|pier"](${bb}););out center tags;`
  };
  const out = { poste: id, zone: Z, date: new Date().toISOString(), source: "© contributeurs OpenStreetMap (ODbL), via Overpass ; EMODnet Bathymetry", requetes: {} };
  for (const [k, q] of Object.entries(reqs)) {
    const r = await overpass(q);
    out.requetes[k] = { serveur: r.serveur, erreurs: r.erreurs, nb: r.elements.length };
    out[k] = r.elements;
    console.log(k, r.elements.length, r.serveur, r.erreurs.join(" ; "));
    await sleep(3000);
  }
  // Segments de côte (hors ouvrages) pour mesurer la distance des chemins à la mer
  const segs = [];
  (out.cote || []).forEach(w => { const g = (w.geometry || []).filter(Boolean); for (let i = 1; i < g.length; i++) segs.push([g[i - 1], g[i]]); });
  const dCote = p => segs.length ? Math.min(...segs.map(([a, b]) => dSeg(p, a, b))) : null;
  // Chemins qui s'approchent à moins de 400 m de la mer : point le plus proche de la mer, restrictions d'accès
  out.chemins_vers_la_mer = (out.chemins || []).map(w => {
    const g = (w.geometry || []).filter(Boolean); if (!g.length) return null;
    let best = null; for (const p of g) { const d = dCote(p); if (best == null || d < best.d) best = { d, p }; }
    const t = w.tags || {};
    return { id: w.id, highway: t.highway, nom: t.name || null, access: t.access || null, motor_vehicle: t.motor_vehicle || null, vehicle: t.vehicle || null, foot: t.foot || null,
      surface: t.surface || null, tracktype: t.tracktype || null, distanceMer: Math.round(best.d), point: { lat: +best.p.lat.toFixed(5), lon: +best.p.lon.toFixed(5) } };
  }).filter(x => x && x.distanceMer < 400).sort((a, b) => a.point.lon - b.point.lon);
  out.parkings_pres_mer = (out.parkings || []).map(e => ({ id: `${e.type}/${e.id}`, lat: e.lat ?? e.center.lat, lon: e.lon ?? e.center.lon, tags: e.tags }))
    .map(p => ({ ...p, distanceMer: Math.round(dCote(p)) })).filter(p => p.distanceMer < 1500);
  // Profondeur le long de la côte : tous les ≈ 1 km, à 150 et 300 m du bord vers le large (sud)
  out.profils = [];
  for (let lon = Z.bbox[1] + 0.01; lon < Z.bbox[3]; lon += 0.0125) {
    // point de côte le plus proche de cette longitude
    let best = null;
    segs.forEach(([a, b]) => [a, b].forEach(p => { if (Math.abs(p.lon - lon) < 0.003 && (!best || p.lat < best.lat)) best = p; }));
    if (!best) continue;
    const pr = { lat: +best.lat.toFixed(5), lon: +best.lon.toFixed(5) };
    for (const m of [150, 300]) { pr["p" + m] = await profondeur({ lat: best.lat - m / 111320, lon: best.lon }); await sleep(200); }
    out.profils.push(pr);
  }
  delete out.chemins; // gros ; on garde la synthèse
  fs.mkdirSync("/tmp/sortie", { recursive: true });
  fs.writeFileSync(`/tmp/sortie/zone_${id}.json`, JSON.stringify(out, null, 1));
  console.log(`chemins à < 400 m de la mer : ${out.chemins_vers_la_mer.length} ; parkings à < 1,5 km : ${out.parkings_pres_mer.length} ; profils : ${out.profils.length}`);
})().catch(e => { console.error(e); process.exit(1); });
