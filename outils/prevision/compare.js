// Chantier 1, étape 2 : compare l'appli « 3 zones » et l'appli « un point par poste » (fichiers de essai_prevision.js).
// Écrit resume.md (lisible) et comparaison.json. Usage : node compare.js /tmp/out
const fs = require("fs");
const dir = process.argv[2] || "/tmp/out";
const Z = JSON.parse(fs.readFileSync(`${dir}/zones.json`, "utf8")), P = JSON.parse(fs.readFileSync(`${dir}/poste.json`, "utf8"));
global.window = {}; require("../../js/spots.js");
const NOMS = Object.fromEntries(window.SPOTS.map(s => [s.id, s.name]));
const moy = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const q = (a, p) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const dAng = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const r1 = v => v == null ? "—" : (Math.round(v * 10) / 10).toString().replace(".", ",");
const pc = (n, d) => d ? Math.round(100 * n / d) + " %" : "—";

// Mêmes heures dans les deux fichiers ?
const memesHeures = JSON.stringify(Z.heures) === JSON.stringify(P.heures);
const parPoste = {};
for (const id of Object.keys(Z.postes)) {
  const a = Z.postes[id].rows, b = P.postes[id].rows, n = Math.min(a.length, b.length);
  const dl = [], dd = [], dv = [], dr = [], dang = [], dh = [], df = []; let terre = 0, nterre = 0, classeFnu = 0, nf = 0;
  const cls = f => f == null ? null : f < 4 ? 0 : f < 10 ? 1 : f < 30 ? 2 : 3;
  for (let k = 0; k < n; k++) {
    const x = a[k], y = b[k];
    dl.push(Math.abs(x.loup - y.loup)); dd.push(Math.abs(x.dorade - y.dorade));
    if (x.vent != null && y.vent != null) dv.push(Math.abs(x.vent - y.vent));
    if (x.rafales != null && y.rafales != null) dr.push(Math.abs(x.rafales - y.rafales));
    if (x.vent >= 10 && y.vent >= 10) dang.push(dAng(x.dir, y.dir));
    if (x.houle != null && y.houle != null) dh.push(Math.abs(x.houle - y.houle));
    if (x.fnu != null && y.fnu != null) { df.push(Math.abs(x.fnu - y.fnu)); nf++; if (cls(x.fnu) !== cls(y.fnu)) classeFnu++; }
    nterre++; if (x.terre !== y.terre) terre++;
  }
  parPoste[id] = { nom: NOMS[id], zone: Z.postes[id].zone, heures: n,
    noteLoup: { moy: moy(dl), p90: q(dl, 0.9), max: Math.max(...dl), plus5: dl.filter(v => v >= 5).length, plus10: dl.filter(v => v >= 10).length },
    noteDorade: { moy: moy(dd), p90: q(dd, 0.9), max: Math.max(...dd), plus5: dd.filter(v => v >= 5).length, plus10: dd.filter(v => v >= 10).length },
    vent: moy(dv), rafales: moy(dr), direction: moy(dang), houle: moy(dh), fnu: moy(df), classeFnuDiff: classeFnu, nf, ventTerreMerDiff: terre, nterre };
}

// Décision : pour chaque jour (0 à 2), créneau du matin (5-11 h) et du soir (15-21 h), chaque espèce,
// meilleure note de chaque poste dans le créneau, puis classement des postes. Même meilleur poste ? même trio de tête ?
const heure = k => +Z.heures[k].slice(11, 13), jour = k => Z.heures[k].slice(0, 10);
const jours = [...new Set(Z.heures.map((h, k) => jour(k)))].slice(0, 3);
const decisions = [];
for (const j of jours) for (const [cren, h1, h2] of [["matin", 5, 11], ["soir", 15, 21]]) for (const esp of ["loup", "dorade"]) {
  const ks = Z.heures.map((h, k) => k).filter(k => jour(k) === j && heure(k) >= h1 && heure(k) <= h2);
  if (ks.length < 3) continue;
  const best = F => Object.keys(F.postes).map(id => ({ id: +id, note: Math.max(...ks.map(k => F.postes[id].rows[k][esp])) })).sort((x, y) => y.note - x.note);
  const bz = best(Z), bp = best(P);
  const top = b => b.slice(0, 3).map(x => x.id);
  decisions.push({ jour: j, creneau: cren, espece: esp, zones: bz.slice(0, 3), poste: bp.slice(0, 3),
    // ex aequo compris : le poste choisi avec les zones a aussi la meilleure note dans la version « poste »
    memeMeilleur: bz[0].id === bp[0].id || bp.find(x => x.id === bz[0].id).note === bp[0].note, memeTrio: top(bz).sort().join() === top(bp).sort().join(),
    ecartMeilleur: bp[0].note - bz[0].note,
    // le poste choisi avec les zones : quelle note lui donne la version « poste » ?
    choixZonesVuParPoste: bp.find(x => x.id === bz[0].id).note });
}

// Écart pur des modèles sur les séries complètes (7 jours passés + prévision) : vent et houle au large
const brut = {};
for (const id of Object.keys(Z.postes)) {
  const a = Z.postes[id].brut, b = P.postes[id].brut, n = Math.min(a.vent.length, b.vent.length);
  const dv = [], dh = [];
  for (let k = 0; k < n; k++) { if (a.vent[k] != null && b.vent[k] != null) dv.push(Math.abs(a.vent[k] - b.vent[k])); if (a.houle[k] != null && b.houle[k] != null) dh.push(Math.abs(a.houle[k] - b.houle[k])); }
  brut[id] = { vent: moy(dv), vent90: q(dv, 0.9), houle: moy(dh), houle90: q(dh, 0.9), nHoule: dh.length, nVent: dv.length };
}

const nd = decisions.length, mm = decisions.filter(d => d.memeMeilleur).length, mt = decisions.filter(d => d.memeTrio).length;
const L = [];
L.push(`# Étape 2 : prévision au poste ou par zone ? (essai du ${new Date(Z.genere).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })})`);
L.push("");
L.push(`Deux copies de l'appli, mêmes données du même moment : **zones** (3 points météo et mer pour 16 postes, l'appli actuelle) et **poste** (un point météo à chaque poste, un point mer à 3 km au large de chaque poste). ${Z.heures.length} heures comparées à partir de ${Z.heures[0]} (heure de Paris). Mêmes heures dans les deux : ${memesHeures ? "oui" : "NON"}. Météo-France jusqu'à l'heure n° ${Z.mfEnd} de la série (après : ECMWF, maille 25 km, qui ne voit presque pas la différence entre postes).`);
L.push("");
L.push(`## Ce que ça change pour le choix du poste`);
L.push(`- Meilleur poste identique : **${mm} cas sur ${nd}** (${jours.length} jours × matin et soir × loup et dorade).`);
L.push(`- Même trio de tête (dans n'importe quel ordre) : **${mt} cas sur ${nd}**.`);
const diff = decisions.filter(d => !d.memeMeilleur);
if (diff.length) {
  L.push(`- Cas où le meilleur poste change :`);
  diff.forEach(d => L.push(`  - ${d.jour} ${d.creneau}, ${d.espece} : zones → ${d.zones[0].id}. ${NOMS[d.zones[0].id]} (${d.zones[0].note}) ; poste → ${d.poste[0].id}. ${NOMS[d.poste[0].id]} (${d.poste[0].note}), et le choix « zones » y vaut ${d.choixZonesVuParPoste}.`));
}
L.push("");
L.push(`## Écart des notes, poste par poste (72 h, points de note sur 100)`);
L.push(`| Poste | zone | loup : écart moyen / 90 % / max | heures ≥ 5 pts | dorade : moyen / 90 % / max | vent (km/h) | direction (°, vent ≥ 10) | houle au poste (m) | couleur de l'eau : FNU / classe changée | vent de terre ↔ de mer changé |`);
L.push(`|---|---|---|---|---|---|---|---|---|---|`);
for (const [id, x] of Object.entries(parPoste)) L.push(`| ${id}. ${x.nom} | ${x.zone} | ${r1(x.noteLoup.moy)} / ${x.noteLoup.p90} / ${x.noteLoup.max} | ${pc(x.noteLoup.plus5, x.heures)} | ${r1(x.noteDorade.moy)} / ${x.noteDorade.p90} / ${x.noteDorade.max} | ${r1(x.vent)} | ${r1(x.direction)} | ${r1(x.houle)} | ${r1(x.fnu)} / ${pc(x.classeFnuDiff, x.nf)} | ${pc(x.ventTerreMerDiff, x.nterre)} |`);
L.push("");
L.push(`## Écart brut des modèles (7 jours passés + prévision), point du poste vs point de la zone`);
L.push(`| Poste | vent : écart moyen / 90 % (km/h) | houle au large : moyen / 90 % (m) |`);
L.push(`|---|---|---|`);
for (const [id, x] of Object.entries(brut)) L.push(`| ${id} | ${r1(x.vent)} / ${r1(x.vent90)} | ${r1(x.houle)} / ${r1(x.houle90)} (${x.nHoule} h) |`);
L.push("");
L.push(`Limites : une seule situation météo (celle de cette nuit) ; « mieux » ne veut pas dire « plus juste » : seule la comparaison avec des mesures (bouées, stations, carnet) dirait quel point est le plus proche de la réalité. Erreurs JavaScript : zones ${Z.erreurs.length}, poste ${P.erreurs.length}.`);
fs.writeFileSync(`${dir}/resume.md`, L.join("\n") + "\n");
fs.writeFileSync(`${dir}/comparaison.json`, JSON.stringify({ parPoste, decisions, brut }, null, 1));
console.log(L.slice(0, 12).join("\n"));
