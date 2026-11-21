// Chantier 1 (21 nov. 2026, nuit) : « joignable à pied » par le bord de mer.
// Pourquoi : le routeur piéton (verifier.js) ne connaît que les chemins cartographiés ; il ignore la marche sur le sable
// et sur les épis, et accroche parfois un point au chemin d'en face, de l'autre côté d'un chenal. Résultat des contrôles
// du 21 nov. 0 h 13 : deux épis voisins du Boucanet (170 m) donnés « à écarter », trois points de plage donnés à plus de 1,5 km.
// Méthode :
// 1. Trait de côte OpenStreetMap (natural=coastline, tous les relevés réunis) mis bout à bout en lignes continues.
//    Un brise-lames détaché (île : ligne fermée) n'est pas pris : il se pêche depuis la plage en face.
// 2. Chaque point est projeté sur la ligne de côte la plus proche ; distance par le bord = longueur de côte entre les deux
//    projections (+ distance de chaque point à la côte, pour un bout d'épi).
//    En suivant la côte, on s'autorise à couper une jetée ou un épi par le dessus (raccourci de moins de 80 m côté terre),
//    jamais un chenal (raccourci côté mer).
// 3. Obstacle : un cours d'eau ou canal OSM entre les deux (ligne droite P → point qui le coupe, embouchure prolongée de 400 m
//    vers la mer entre les jetées), ou une côte qui fait un grand détour (port : plus de 3 fois la ligne droite et 500 m de plus).
// 4. S'il y a un obstacle, on regarde le trajet du routeur piéton (verifier.js) : il passe par les ponts et passerelles.
// Avis : « joignable par le bord » si pas d'obstacle et ≤ 1 500 m ; « joignable par un pont » si le trajet du routeur
// fait ≤ 1 500 m (à confirmer par Nico : même zone ou pas ?) ; sinon « à écarter ».
// Seuils [P] (Nico, 20 nov. : ≈ 1 km, joignable à pied) : 1 500 m ≈ 20 min de marche.
// 5. Deux têtes de jetée face à face (feu rouge / feu vert à moins de 250 m) = entrée de port ou de chenal entre les deux.
// 6. Si le routeur piéton fait un très grand détour alors que le bord semble libre : « à vérifier sur la photo ».
// Contrôle : outils/postes/temoins.js (9 cas connus, 9 conformes le 21 nov.). Limites connues : un chenal de port que OSM
// ne dessine pas (ni cours d'eau, ni côte qui y entre) n'est vu que par les feux ou par le routeur ; le trait de côte OSM
// peut être ancien (plage qui a avancé, poste 6) ; le routeur ignore la marche sur le sable. Toujours finir par la photo aérienne.
// Usage : node outils/postes/cote.js dossier_des_releves 8 [9 …]  (lit poste_*.json et verif_*.json du dossier)
const fs = require("fs");
const rad = d => d * Math.PI / 180;
const LAT0 = 43.5;
const xy = p => [rad(p.lon) * Math.cos(rad(LAT0)) * 6371000, rad(p.lat) * 6371000];
const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const dist = (a, b) => d2(xy(a), xy(b));
const key = p => p.lat.toFixed(7) + "," + p.lon.toFixed(7);

function charger(dossier) {
  const cote = new Map(), eaux = new Map(), noms = new Map(), feux = new Map();
  for (const f of fs.readdirSync(dossier).filter(f => /^(poste|verif)_\d+\.json$/.test(f))) {
    const j = JSON.parse(fs.readFileSync(`${dossier}/${f}`, "utf8"));
    const els = [...(j.elements || []), ...((j.cote && j.cote.elements) || [])];
    for (const e of els) {
      const tf = e.tags || {};
      if (e.type === "node" && /^(red|green)$/.test(tf["seamark:light:colour"] || "")) feux.set(e.id, { lat: e.lat, lon: e.lon, couleur: tf["seamark:light:colour"] });
      if (e.type !== "way" || !e.geometry) continue;
      const t = e.tags || {};
      // morceaux continus (les géométries coupées par la boîte de recherche ont des trous)
      const parts = []; let cur = [];
      for (const p of e.geometry) { if (p) cur.push({ lat: p.lat, lon: p.lon }); else { if (cur.length > 1) parts.push(cur); cur = []; } }
      if (cur.length > 1) parts.push(cur);
      if (t.natural === "coastline") {
        const old = cote.get(e.id);
        const n = parts.reduce((s, x) => s + x.length, 0);
        if (!old || n > old.n) cote.set(e.id, { parts, n, tags: t });
      }
      if (t.waterway && /^(river|canal|stream|drain)$/.test(t.waterway)) eaux.set(e.id, { parts, tags: t });
      if (t.name) noms.set(e.id, t.name);
    }
  }
  return { cote, eaux, feux };
}

// Met les morceaux de côte bout à bout (le dernier point de l'un = le premier de l'autre)
function lignes(cote) {
  let morceaux = [];
  for (const [id, w] of cote) for (const p of w.parts) morceaux.push({ ids: [id], pts: p });
  let fusion = true;
  while (fusion) {
    fusion = false;
    const debut = new Map(); morceaux.forEach((m, i) => debut.set(key(m.pts[0]), i));
    for (let i = 0; i < morceaux.length && !fusion; i++) {
      const m = morceaux[i]; const fin = key(m.pts[m.pts.length - 1]);
      const j = debut.get(fin);
      if (j != null && j !== i) {
        const n = morceaux[j];
        morceaux[i] = { ids: [...m.ids, ...n.ids], pts: [...m.pts, ...n.pts.slice(1)] };
        morceaux.splice(j, 1); fusion = true;
      }
    }
  }
  return morceaux.map(m => {
    const P = m.pts.map(xy), s = [0];
    for (let i = 1; i < P.length; i++) s.push(s[i - 1] + d2(P[i - 1], P[i]));
    return { ...m, P, s, fermee: key(m.pts[0]) === key(m.pts[m.pts.length - 1]) };
  });
}

function projeter(L, p) {
  const q = xy(p); let best = null;
  L.forEach((l, li) => {
    if (l.fermee) return;
    for (let i = 1; i < l.P.length; i++) {
      const a = l.P[i - 1], b = l.P[i], dx = b[0] - a[0], dy = b[1] - a[1];
      const t = dx || dy ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy))) : 0;
      const r = [a[0] + t * dx, a[1] + t * dy], d = d2(q, r);
      if (!best || d < best.d) best = { li, i, t, d, s: l.s[i - 1] + t * d2(a, b), r };
    }
  });
  return best;
}

function coupe(a, b, c, d) { // segments [a,b] et [c,d] se croisent ?
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}

// Cours d'eau entre deux points : le segment P → X coupe-t-il un cours d'eau ou canal OSM, prolongé de 400 m vers la mer
// au niveau de son embouchure (le cours d'eau s'arrête au trait de côte, mais le chenal continue entre les jetées) ?
// Un point à moins de 5 m du cours d'eau est posé dessus (poste 1 : fin du Petit Rhône) : ce cours d'eau n'est pas compté pour lui.
// (21 nov. : avec 30 m, les deux jetées d'un même grau, à 20 m de l'axe, étaient données « joignables » — poste 6 et 13.)
function eauxEntre(P, X, eaux, L) {
  const a = xy(P), b = xy(X), trouve = new Set();
  for (const [id, w] of eaux) for (const part of w.parts) {
    const Q = part.map(xy);
    // prolongement à l'embouchure : si une extrémité touche la côte (< 60 m), on prolonge le dernier segment de 400 m
    const ext = [];
    for (const [e, f] of [[Q[Q.length - 1], Q[Q.length - 2]], [Q[0], Q[1]]]) {
      const pr = projeterXY(L, e);
      if (pr && pr.d < 60) { const dx = e[0] - f[0], dy = e[1] - f[1], n = Math.hypot(dx, dy) || 1; ext.push([e, [e[0] + 400 * dx / n, e[1] + 400 * dy / n]]); }
    }
    const segs = [];
    for (let k = 1; k < Q.length; k++) segs.push([Q[k - 1], Q[k]]);
    segs.push(...ext);
    const pres = q => segs.some(([c, d]) => dSeg(q, c, d) < 5);
    if (pres(a) || pres(b)) continue;
    if (segs.some(([c, d]) => coupe(a, b, c, d))) trouve.add((w.tags.name || `${w.tags.waterway} ${id}`) + (ext.length ? "" : ""));
  }
  return [...trouve];
}
function dSeg(q, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = dx || dy ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy))) : 0;
  return d2(q, [a[0] + t * dx, a[1] + t * dy]);
}
function projeterXY(L, q) {
  let best = null;
  L.forEach(l => { for (let i = 1; i < l.P.length; i++) { const d = dSeg(q, l.P[i - 1], l.P[i]); if (!best || d < best.d) best = { d }; } });
  return best;
}
// Côté terre ? (convention OSM : la terre est à gauche du trait de côte)
function aTerre(L, q) {
  let best = null;
  L.forEach(l => { for (let i = 1; i < l.P.length; i++) { const a = l.P[i - 1], b = l.P[i], d = dSeg(q, a, b); if (!best || d < best.d) best = { d, a, b }; } });
  if (!best) return false;
  const { a, b } = best;
  return (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]) > 0;
}
// Distance à pied par le bord : on suit la côte entre les deux projections, avec des raccourcis de moins de 80 m
// seulement s'ils passent par la terre (traverser une jetée ou un épi par le dessus : oui ; traverser un chenal : non).
function parLeBord(L, l, s1, s2) {
  const [lo, hi] = [Math.min(s1, s2), Math.max(s1, s2)];
  const pt = s => { let i = 1; while (i < l.s.length - 1 && l.s[i] < s) i++; const t = (s - l.s[i - 1]) / ((l.s[i] - l.s[i - 1]) || 1); return [l.P[i - 1][0] + t * (l.P[i][0] - l.P[i - 1][0]), l.P[i - 1][1] + t * (l.P[i][1] - l.P[i - 1][1])]; };
  const N = [];
  const n = Math.max(1, Math.ceil((hi - lo) / 20));
  for (let k = 0; k <= n; k++) N.push(pt(lo + (hi - lo) * k / n));
  const D = N.map(() => Infinity); D[0] = 0;
  const vu = N.map(() => false);
  for (let it = 0; it < N.length; it++) {
    let u = -1; for (let i = 0; i < N.length; i++) if (!vu[i] && (u < 0 || D[i] < D[u])) u = i;
    if (u < 0 || D[u] === Infinity) break; vu[u] = true;
    for (let v = 0; v < N.length; v++) {
      if (vu[v] || v === u) continue;
      const e = d2(N[u], N[v]);
      let ok = Math.abs(u - v) === 1;
      if (!ok && e < 80) { const m = [(N[u][0] + N[v][0]) / 2, (N[u][1] + N[v][1]) / 2]; ok = aTerre(L, m); }
      if (ok && D[u] + e < D[v]) D[v] = D[u] + e;
    }
  }
  return { arc: hi - lo, bord: D[N.length - 1] };
}

// Deux têtes de jetée face à face : un point à moins de 40 m d'un feu rouge, l'autre à moins de 40 m d'un feu vert,
// les deux feux à moins de 250 m l'un de l'autre → entrée de port ou de chenal entre les deux (21 nov. : poste 16,
// chenal du port de Frontignan que OSM ne dessine ni en cours d'eau ni en côte).
function feuxEnFace(P, X, feux) {
  if (!feux) return null;
  const pres = q => [...feux.values()].filter(f => dist(q, f) < 40);
  for (const a of pres(P)) for (const b of pres(X)) if (a.couleur !== b.couleur && dist(a, b) < 250) return `entrée entre le feu ${a.couleur === "red" ? "rouge" : "vert"} et le feu ${b.couleur === "red" ? "rouge" : "vert"}`;
  return null;
}

function analyser(L, eaux, P, X, trajet, feux) {
  const pp = projeter(L, P), px = projeter(L, X), vol = dist(P, X);
  const r = { vol: Math.round(vol), aCote: [Math.round(pp.d), Math.round(px.d)] };
  r.eaux = eauxEntre(P, X, eaux, L);
  const ff = feuxEnFace(P, X, feux); if (ff) r.eaux.push(ff);
  let bordOk = false;
  if (pp.li === px.li) {
    const b = parLeBord(L, L[pp.li], pp.s, px.s);
    r.bord = Math.round(b.bord + pp.d + px.d); r.arc = Math.round(b.arc);
    // 3 fois la ligne droite et 500 m de plus : un port ou un chenal (marcher le long d'une jetée de 600 m fait déjà 2,5 fois, poste 5)
    r.detourCote = r.bord > 3 * Math.max(vol, 1) && r.bord - vol > 500;
    if (!r.detourCote && r.bord > 2 * vol && r.bord - vol > 400) r.note = "détour le long de la côte (jetée ?) : à regarder sur la photo";
    bordOk = !r.eaux.length && !r.detourCote;
  } else r.bord = null;
  const route = trajet && !trajet.erreur ? trajet.pied + trajet.accroche[0] + trajet.accroche[1] : null;
  r.route = route;
  // Désaccord avec le routeur : il fait un très grand détour (plus de 3 fois la ligne droite entre ses points d'accroche,
  // et plus de 800 m de plus) alors que le bord semble libre → peut-être un chenal que OSM ne dessine pas (poste 16).
  if (trajet && !trajet.erreur && trajet.accroches) {
    const entre = Math.max(dist(trajet.accroches[0], trajet.accroches[1]), 1);
    if (trajet.pied > 3 * entre && trajet.pied - entre > 800) r.alerte = `le routeur piéton fait ${trajet.pied} m pour ${Math.round(entre)} m : chenal ou port possible, à vérifier sur la photo`;
  }
  if (bordOk && r.bord <= 1500 && r.alerte) { r.avis = "à vérifier sur la photo"; r.pourquoi = `≈ ${r.bord} m en longeant la côte, mais ${r.alerte}`; }
  else if (bordOk && r.bord <= 1500) { r.avis = "joignable par le bord"; r.pourquoi = `≈ ${r.bord} m en longeant la côte (≈ ${Math.round(r.bord / 75)} min), aucun cours d'eau ni chenal entre les deux`; }
  else if (bordOk) { r.avis = "à écarter"; r.pourquoi = `${r.bord} m en longeant la côte : plus de 1 500 m`; }
  else {
    const obst = r.bord == null ? "pas de côte continue entre les deux dans OSM" : r.eaux.length ? `${r.eaux.join(", ")} entre les deux` : `la côte fait le tour d'un port ou d'un chenal (${r.bord} m par le bord pour ${r.vol} m à vol d'oiseau)`;
    if (route != null && route <= 1500) { r.avis = "joignable en contournant (à confirmer)"; r.pourquoi = `${obst} ; le routeur piéton trouve ${route} m (≈ ${Math.round(route / 75)} min) par les chemins, quais et ponts`; }
    else { r.avis = "à écarter"; r.pourquoi = `${obst}${route != null ? ` ; par les chemins et les ponts : ${route} m` : ""}`; }
  }
  return r;
}

// Direction de la mer (« seaward », degrés, 0 = nord) au droit d'un point : perpendiculaire à la côte lissée sur ± 300 m,
// du côté mer (à droite du trait de côte OSM). Sert au vent de terre / de mer et à la houle de face.
function versLeLarge(L, p) {
  const pr = projeter(L, p); if (!pr) return null;
  const l = L[pr.li];
  const at = s => { s = Math.max(0, Math.min(l.s[l.s.length - 1], s)); let i = 1; while (i < l.s.length - 1 && l.s[i] < s) i++; const t = (s - l.s[i - 1]) / ((l.s[i] - l.s[i - 1]) || 1); return [l.P[i - 1][0] + t * (l.P[i][0] - l.P[i - 1][0]), l.P[i - 1][1] + t * (l.P[i][1] - l.P[i - 1][1])]; };
  const a = at(pr.s - 300), b = at(pr.s + 300);
  const dir = Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI; // cap de la côte (sens OSM, terre à gauche)
  return Math.round(((dir + 90) % 360 + 360) % 360 / 5) * 5; // à droite = mer, arrondi à 5°
}

module.exports = { charger, lignes, analyser, dist, versLeLarge };

if (require.main === module) {
  const [dossier, ...ids] = process.argv.slice(2);
  const { cote, eaux, feux } = charger(dossier), L = lignes(cote);
  console.log(`côte : ${cote.size} lignes OSM → ${L.length} morceaux continus (${L.filter(l => l.fermee).length} fermés) ; cours d'eau : ${eaux.size}`);
  const res = {};
  for (const id of ids.map(Number)) {
    const v = JSON.parse(fs.readFileSync(`${dossier}/verif_${id}.json`, "utf8"));
    const P = v.points.find(p => p.label === "P") || v.points[0];
    res[id] = v.points.filter(p => p !== P).map(x => ({ label: x.label, name: x.name, ...analyser(L, eaux, P, x, x.trajet, feux) }));
    console.log(`poste ${id} :`);
    res[id].forEach(x => console.log(`  ${x.label} ${x.name} : ${x.avis} — ${x.pourquoi} [vol ${x.vol} m, à la côte ${x.aCote.join(" / ")} m]`));
  }
  if (process.env.SORTIE) fs.writeFileSync(process.env.SORTIE, JSON.stringify(res, null, 1));
}
