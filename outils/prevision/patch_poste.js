// Chantier 1, étape 2 (22 nov. 2026, nuit) : « la prévision au poste vaut-elle le coup ? »
// Prépare deux copies de l'appli (jamais publiées) pour les comparer dans Chrome sans écran :
//   - zones : l'appli telle quelle (3 zones de météo et de mer pour 16 postes) ;
//   - poste : chaque poste a son propre point météo (à sa position) et son propre point mer (3 km vers le large,
//     maille de mer la plus proche : cell_selection=sea), les zones W, C, E restant demandées pour ce qui s'en sert encore
//     (température de l'eau de secours, résumé « vent » de la fiche, alertes).
// Dans les deux copies, une ligne expose scoreAt et l'état à l'essai (window.__test), rien d'autre ne change.
// Usage : node patch_poste.js dossier_zones dossier_poste
const fs = require("fs");
const [dz, dp] = process.argv.slice(2);
const expose = f => {
  const p = `${f}/js/app.js`; let s = fs.readFileSync(p, "utf8");
  const k = s.lastIndexOf("  start();");
  if (k < 0) throw new Error("start() introuvable dans app.js");
  s = s.slice(0, k) + "  window.__test = { scoreAt: (s, i, sp) => scoreAt(s, i, sp), conditions: (s, i) => conditions(s, i), state };\n" + s.slice(k);
  fs.writeFileSync(p, s);
  // pas de service worker dans l'essai (évite de servir une copie gardée de l'autre version)
  const ip = `${f}/js/app.js`; let a = fs.readFileSync(ip, "utf8");
  a = a.replace('if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => { });', "");
  fs.writeFileSync(ip, a);
};
expose(dz); expose(dp);

// Copie « poste » : un point par poste
const sp = `${dp}/js/spots.js`;
fs.appendFileSync(sp, `
// --- Essai étape 2 (copie jamais publiée) : un point météo et mer par poste ---
(function () {
  const rad = d => d * Math.PI / 180;
  window.SPOTS.forEach(s => {
    const m = 3000, la = s.lat + m * Math.cos(rad(s.seaward)) / 111320, lo = s.lon + m * Math.sin(rad(s.seaward)) / (111320 * Math.cos(rad(s.lat)));
    window.WX_POINTS["P" + s.id] = { name: "Poste " + s.id, land: [s.lat, s.lon], sea: [+la.toFixed(4), +lo.toFixed(4)], zoneAvant: s.zone };
    s.zone = "P" + s.id;
  });
})();
`);
const dpth = `${dp}/js/data.js`;
let d = fs.readFileSync(dpth, "utf8");
const ids = Array.from({ length: 16 }, (_, k) => `"P${k + 1}"`).join(", ");
const n1 = d.replace(`const ZL = ["W", "C", "E", "RV", "RL"], ZS = ["W", "C", "E"];`, `const ZL = [${ids}, "W", "C", "E", "RV", "RL"], ZS = [${ids}, "W", "C", "E"];`);
if (n1 === d) throw new Error("ZL/ZS introuvables dans data.js");
// Mer : maille de mer la plus proche (sinon un point près du bord peut tomber sur une maille « terre », sans houle)
const n2 = n1.replace(`"&hourly=wave_height,wave_direction,wave_period,sea_surface_temperature&past_days=7`, `"&cell_selection=sea&hourly=wave_height,wave_direction,wave_period,sea_surface_temperature&past_days=7`);
if (n2 === n1) throw new Error("adresse mer introuvable dans data.js");
fs.writeFileSync(dpth, n2);
console.log("copies prêtes :", dz, dp);
