// Prospection de l'étang du Ponant (26 nov. 2026, demande de Nico : « pas de poste connu, à chercher et à prospecter »).
// Relevé OpenStreetMap autour de l'étang : rive (polygone de l'étang), chemins publics qui touchent l'eau, parkings, ponts,
// déversoirs, ouvrages, espaces protégés, zones privées ou interdites, plages, lieux-dits, activités nautiques.
// Sort des « accès au bord » candidats : un chemin public dont un point est à moins de 25 m de l'eau, regroupés tous les 200 m,
// avec le parking OSM le plus proche (vol d'oiseau), l'espace protégé qui les contient, les restrictions d'accès vues.
// Ce ne sont PAS des postes : des endroits où l'on peut arriver au bord, à regarder sur photo aérienne puis sur Géoportail par Nico.
// Règles (LECONS.md) : User-Agent obligatoire, serveurs Overpass de secours, délai d'attente sur chaque requête.
const fs = require("fs");
const UA = "Carte-peche/1.0 (usage perso ; github.com/nicolasbonini1-commits/Carte-peche)";
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const BBOX = [43.540, 4.080, 43.600, 4.145]; // S, O, N, E
const OUT = process.env.OUT || "/tmp/sortie";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rad = d => d * Math.PI / 180;
const xy = p => [rad(p.lon) * Math.cos(rad(43.57)) * 6371000, rad(p.lat) * 6371000];
const dist = (a, b) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return Math.hypot(ax - bx, ay - by); };
function dSeg(p, a, b) {
  const [px, py] = xy(p), [ax, ay] = xy(a), [bx, by] = xy(b), dx = bx - ax, dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
const journal = [];
async function overpass(q) {
  for (let passe = 0; passe < 3; passe++) {
    if (passe) await sleep(45000);
    for (const url of OVERPASS) {
      const t = Date.now();
      try {
        const r = await fetch(url, { method: "POST", signal: AbortSignal.timeout(150000), headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) });
        journal.push({ url, code: r.status, s: (Date.now() - t) / 1000, a: new Date().toISOString() });
        if (r.ok) { const j = await r.json(); if (j.elements) return { serveur: url, elements: j.elements }; }
      } catch (e) { journal.push({ url, erreur: e.message, s: (Date.now() - t) / 1000 }); }
    }
  }
  return { serveur: null, elements: [] };
}
// 26 nov. : l'étang est une relation dont les membres n'ont pas tous le rôle « outer » (1er passage : rive vide) → tout membre sauf « inner ».
const ringsOf = e => e.type === "way" ? [e.geometry || []] : e.type === "relation" ? (e.members || []).filter(m => m.role !== "inner" && m.geometry).map(m => m.geometry) : [];
// Point dans un polygone dont le contour est découpé en plusieurs chemins : on compte les croisements sur tous les segments.
const insideE = (p, e) => { let c = false; for (const g of ringsOf(e)) for (let i = 1; i < g.length; i++) { const a = g[i - 1], b = g[i]; if ((a.lat > p.lat) !== (b.lat > p.lat) && p.lon < (b.lon - a.lon) * (p.lat - a.lat) / (b.lat - a.lat) + a.lon) c = !c; } return c; };
const centre = e => e.type === "node" ? { lat: e.lat, lon: e.lon } : e.center ? e.center : e.geometry ? e.geometry[Math.floor(e.geometry.length / 2)] : e.bounds ? { lat: (e.bounds.minlat + e.bounds.maxlat) / 2, lon: (e.bounds.minlon + e.bounds.maxlon) / 2 } : null;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = BBOX.join(",");
  const q = `[out:json][timeout:140];(
    way["natural"="water"](${b}); relation["natural"="water"](${b}); way["natural"="coastline"](${b});
    way["highway"](${b});
    nwr["amenity"="parking"](${b});
    nwr["waterway"~"weir|dam|lock_gate|sluice_gate|canal|river"](${b}); nwr["man_made"~"pier|groyne|breakwater|dyke|embankment|bridge"](${b});
    nwr["leisure"~"fishing|slipway|marina|park|beach_resort|nature_reserve"](${b}); nwr["fishing"](${b});
    nwr["boundary"="protected_area"](${b}); nwr["place"](${b}); nwr["natural"="beach"](${b});
    nwr["sport"~"water_ski|wakeboard|windsurfing|swimming"](${b}); nwr["landuse"~"military|industrial"](${b});
  );out geom tags;`;
  const r = await overpass(q);
  const E = r.elements;
  const eaux = E.filter(e => e.tags && e.tags.natural === "water");
  const etang = eaux.filter(e => /ponant/i.test(e.tags.name || "")).sort((a, c) => ringsOf(c).flat().length - ringsOf(a).flat().length)[0] || null;
  const rive = etang ? ringsOf(etang) : [];
  const dRive = p => { let m = Infinity; for (const g of rive) for (let i = 1; i < g.length; i++) m = Math.min(m, dSeg(p, g[i - 1], g[i])); return m; };
  const parkings = E.filter(e => e.tags && e.tags.amenity === "parking").map(e => ({ id: `${e.type}/${e.id}`, ...centre(e), nom: e.tags.name || "", acces: e.tags.access || "", frais: e.tags.fee || "" }));
  const proteges = E.filter(e => e.tags && (e.tags.boundary === "protected_area" || e.tags.leisure === "nature_reserve"));
  const prive = v => /^(no|private)$/.test(v || "");
  const chemins = E.filter(e => e.type === "way" && e.tags && e.tags.highway && e.geometry);
  // Points de chemins à moins de 25 m de la rive
  const touches = [];
  for (const w of chemins) {
    const t = w.tags, interdit = prive(t.access) || prive(t.foot);
    for (const p of w.geometry) { const d = dRive(p); if (d <= 25) touches.push({ lat: p.lat, lon: p.lon, d, way: w.id, hw: t.highway, nom: t.name || "", interdit, acces: [t.access, t.foot].filter(Boolean).join("/") }); }
  }
  // Regroupement tous les 200 m (le point le plus près de l'eau sert de représentant)
  touches.sort((a, c) => a.d - c.d);
  const groupes = [];
  for (const p of touches) { const g = groupes.find(g => dist(g.rep, p) < 200); if (g) { g.pts.push(p); } else groupes.push({ rep: p, pts: [p] }); }
  const cand = groupes.map((g, i) => {
    const p = g.rep; const pk = parkings.map(k => ({ ...k, d: Math.round(dist(k, p)) })).sort((a, c) => a.d - c.d)[0] || null;
    const pr = proteges.filter(e => insideE(p, e)).map(e => e.tags.name || e.tags.protect_title || `${e.type}/${e.id}`);
    const chem = [...new Set(g.pts.map(x => `${x.hw}${x.nom ? " « " + x.nom + " »" : ""}${x.acces ? " [" + x.acces + "]" : ""}`))];
    return { n: i + 1, lat: +p.lat.toFixed(5), lon: +p.lon.toFixed(5), a_eau_m: Math.round(p.d), interdit: g.pts.every(x => x.interdit), chemins: chem, longueur_rive_m: Math.round(Math.max(0, ...g.pts.map(x => dist(x, p)))) * 2,
      parking: pk ? { id: pk.id, nom: pk.nom, d_m: pk.d, acces: pk.acces, payant: pk.frais } : null, protege: pr, ways: [...new Set(g.pts.map(x => x.way))] };
  });
  const objets = E.filter(e => e.tags && (e.tags.bridge || /weir|dam|lock_gate|sluice_gate/.test(e.tags.waterway || "") || /pier|groyne|breakwater|dyke|embankment/.test(e.tags.man_made || "") || e.tags.fishing || /fishing|slipway|marina|park|beach_resort/.test(e.tags.leisure || "") || e.tags.place || e.tags.natural === "beach" || e.tags.sport))
    .map(e => { const c = centre(e); return c && { id: `${e.type}/${e.id}`, lat: +c.lat.toFixed(5), lon: +c.lon.toFixed(5), d_eau_m: rive.length ? Math.round(dRive(c)) : null, tags: Object.fromEntries(Object.entries(e.tags).filter(([k]) => /name|bridge|waterway|man_made|leisure|fishing|place|natural|sport|access|highway|foot/.test(k))) }; })
    .filter(o => o && (o.d_eau_m == null || o.d_eau_m < 400));
  const res = { genere: new Date().toISOString(), serveur: r.serveur, journal, bbox: BBOX, nb_elements: E.length,
    membres_etang: etang && etang.members ? [...new Set(etang.members.map(m => m.role || "(vide)"))] : null, etang: etang ? { id: `${etang.type}/${etang.id}`, nom: etang.tags.name, tags: etang.tags, points_rive: rive.flat().length } : null,
    eaux: eaux.map(e => ({ id: `${e.type}/${e.id}`, nom: e.tags.name || "", water: e.tags.water || "" })),
    candidats: cand, parkings, proteges: proteges.map(e => ({ id: `${e.type}/${e.id}`, nom: e.tags.name || "", tags: e.tags })), objets,
    rive_geo: rive.map(g => g.map(p => [+p.lat.toFixed(5), +p.lon.toFixed(5)])),
    chemins_geo: chemins.filter(w => w.geometry.some(p => dRive(p) < 300)).map(w => ({ id: w.id, hw: w.tags.highway, interdit: prive(w.tags.access) || prive(w.tags.foot), g: w.geometry.map(p => [+p.lat.toFixed(5), +p.lon.toFixed(5)]) })) };
  fs.writeFileSync(`${OUT}/ponant.json`, JSON.stringify(res));
  console.log(`serveur ${r.serveur}, ${E.length} éléments, étang : ${res.etang ? res.etang.id + " " + res.etang.nom : "NON TROUVÉ"} ; eaux : ${res.eaux.map(e => e.nom || e.id).join(" | ")}`);
  console.log(`${cand.length} accès au bord candidats :`);
  cand.forEach(c => console.log(`#${c.n} ${c.lat},${c.lon} à ${c.a_eau_m} m de l'eau ${c.interdit ? "INTERDIT " : ""}— ${c.chemins.join(" ; ")} — parking ${c.parking ? c.parking.d_m + " m " + (c.parking.nom || c.parking.id) : "?"} — ${c.protege.join(", ")}`));
  console.log("objets :"); objets.forEach(o => console.log(`${o.id} ${o.lat},${o.lon} (${o.d_eau_m} m) ${JSON.stringify(o.tags)}`));
})();
