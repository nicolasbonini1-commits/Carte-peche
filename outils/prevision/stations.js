// Chantier 1, étape 2 (22 nov. 2026, nuit) : « plus fin » veut-il dire « plus juste » ?
// Compare le vent mesuré par les stations Météo-France du littoral (données climatologiques de base horaires, data.gouv.fr,
// mises à jour chaque jour pour les deux dernières années) au vent d'Open-Meteo (Météo-France AROME/ARPEGE, jours passés)
// pris (a) au point de la station, (b) au point de la zone de l'appli la plus proche (W, C ou E).
// Si (a) est nettement plus proche de la mesure que (b), une prévision par poste serait plus juste, pas seulement différente.
// Usage : node outils/prevision/stations.js /tmp/out   (écrit stations.json et stations.md)
const fs = require("fs");
const zlib = require("zlib");
global.window = {}; require("../../js/spots.js");
const UA = { "User-Agent": "Carte-peche/1.0 (usage perso ; github.com/nicolasbonini1-commits/Carte-peche)" };
const out = process.argv[2] || "/tmp/out";
const rad = d => d * Math.PI / 180;
const dist = (a, b, c, d) => 6371 * Math.hypot(rad(d - b) * Math.cos(rad((a + c) / 2)), rad(c - a));
const dAng = (a, b) => { const x = Math.abs(a - b) % 360; return x > 180 ? 360 - x : x; };
const moy = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const r1 = v => v == null ? "—" : (Math.round(v * 10) / 10).toString().replace(".", ",");

async function get(url, binaire) {
  for (let k = 0; k < 3; k++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(120000) });
      if (r.ok) return binaire ? Buffer.from(await r.arrayBuffer()) : await r.json();
      console.log("HTTP", r.status, url);
    } catch (e) { console.log("erreur", e.message, url); }
    await new Promise(r => setTimeout(r, 3000 * (k + 1)));
  }
  return null;
}

(async () => {
  // 1. Fichiers « latest » (deux dernières années) des départements 13, 30, 34
  const ds = await get("https://www.data.gouv.fr/api/1/datasets/donnees-climatologiques-de-base-horaires/");
  if (!ds) throw new Error("data.gouv.fr injoignable");
  const res = ds.resources.filter(r => /(_13_|_30_|_34_)/.test(r.title + r.url) && /latest/i.test(r.title + r.url));
  console.log("fichiers :", res.map(r => r.title || r.url).join(" | "));
  const obs = {}; // station → { nom, lat, lon, mesures: {cléHeureUTC: {ff, dd}} }
  for (const r of res) {
    const gz = await get(r.url, true); if (!gz) continue;
    const txt = zlib.gunzipSync(gz).toString("latin1");
    const lignes = txt.split(/\r?\n/); const h = lignes[0].split(";").map(x => x.trim());
    const ix = n => h.indexOf(n);
    const iP = ix("NUM_POSTE"), iN = ix("NOM_USUEL"), iLa = ix("LAT"), iLo = ix("LON"), iT = ix("AAAAMMJJHH"), iF = ix("FF"), iD = ix("DD"), iX = ix("FXI");
    if ([iP, iLa, iLo, iT, iF].some(i => i < 0)) { console.log("colonnes inattendues", h.slice(0, 20).join(";")); continue; }
    const depuis = new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 13).replace(/[-T]/g, "");
    for (let k = 1; k < lignes.length; k++) {
      const c = lignes[k].split(";"); if (c.length < h.length - 2) continue;
      if (c[iT] < depuis) continue;
      const la = +c[iLa].replace(",", "."), lo = +c[iLo].replace(",", ".");
      if (!(la < 43.62 && la > 43.35 && lo > 3.65 && lo < 4.5)) continue; // bande littorale de l'appli
      const ff = c[iF] === "" ? null : +c[iF].replace(",", "."); if (ff == null || isNaN(ff)) continue;
      const st = obs[c[iP]] = obs[c[iP]] || { nom: c[iN], lat: la, lon: lo, mesures: {} };
      st.mesures[c[iT]] = { ff: ff * 3.6, dd: c[iD] === "" ? null : +c[iD], fxi: iX >= 0 && c[iX] !== "" ? +c[iX].replace(",", ".") * 3.6 : null };
    }
  }
  const stations = Object.entries(obs).filter(([, s]) => Object.keys(s.mesures).length >= 72);
  console.log("stations du littoral avec vent :", stations.map(([id, s]) => `${s.nom} (${id}, ${Object.keys(s.mesures).length} h)`).join(" ; "));
  if (!stations.length) throw new Error("aucune station de vent trouvée dans la bande littorale");
  // 2. Open-Meteo, mêmes modèles que l'appli, 14 jours passés, heures en UTC (comme les mesures)
  const Z = ["W", "C", "E"].map(z => ({ z, lat: window.WX_POINTS[z].land[0], lon: window.WX_POINTS[z].land[1] }));
  const pts = [...stations.map(([id, s]) => ({ id, lat: s.lat, lon: s.lon })), ...Z.map(z => ({ id: z.z, lat: z.lat, lon: z.lon }))];
  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + pts.map(p => p.lat).join(",") + "&longitude=" + pts.map(p => p.lon).join(",") +
    "&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&models=meteofrance_seamless&past_days=14&forecast_days=1&timezone=GMT&wind_speed_unit=kmh";
  const om = await get(url);
  if (!om || !Array.isArray(om)) throw new Error("Open-Meteo : réponse inattendue " + JSON.stringify(om).slice(0, 200));
  const serie = k => { const hh = om[k].hourly, vk = Object.keys(hh); const f = p => hh[vk.find(x => x.startsWith(p))];
    const m = {}; hh.time.forEach((t, i) => m[t.slice(0, 13).replace(/[-T]/g, "")] = { ff: f("wind_speed_10m")[i], dd: f("wind_direction_10m")[i], fx: f("wind_gusts_10m")[i] }); return m; };
  const S = {}; pts.forEach((p, k) => S[p.id] = serie(k));
  // 3. Erreurs : point de la station vs point de zone le plus proche
  const lignes = [], json = {};
  for (const [id, s] of stations) {
    const zp = Z.slice().sort((a, b) => dist(s.lat, s.lon, a.lat, a.lon) - dist(s.lat, s.lon, b.lat, b.lon))[0];
    const eA = [], eB = [], dA = [], dB = [], gA = [], gB = [];
    for (const [t, o] of Object.entries(s.mesures)) {
      const a = S[id][t], b = S[zp.z][t];
      if (!a || !b || a.ff == null || b.ff == null) continue;
      eA.push(Math.abs(a.ff - o.ff)); eB.push(Math.abs(b.ff - o.ff));
      if (o.dd != null && o.ff >= 10) { dA.push(dAng(a.dd, o.dd)); dB.push(dAng(b.dd, o.dd)); }
      if (o.fxi != null && a.fx != null && b.fx != null) { gA.push(Math.abs(a.fx - o.fxi)); gB.push(Math.abs(b.fx - o.fxi)); }
    }
    const x = { nom: s.nom, lat: s.lat, lon: s.lon, zone: zp.z, distZoneKm: dist(s.lat, s.lon, zp.lat, zp.lon), heures: eA.length,
      ventStation: moy(eA), ventZone: moy(eB), dirStation: moy(dA), dirZone: moy(dB), nDir: dA.length, rafStation: moy(gA), rafZone: moy(gB), nRaf: gA.length };
    json[id] = x;
    lignes.push(`| ${x.nom} (${id}) | ${x.zone}, à ${r1(x.distZoneKm)} km | ${x.heures} | **${r1(x.ventStation)}** / ${r1(x.ventZone)} | ${r1(x.dirStation)} / ${r1(x.dirZone)} (${x.nDir} h) | ${r1(x.rafStation)} / ${r1(x.rafZone)} (${x.nRaf} h) |`);
  }
  const md = [`# Vent mesuré aux stations du littoral : prévision au point de la station ou au point de la zone ?`, "",
    `Données : Météo-France, données climatologiques de base horaires (data.gouv.fr, Licence Ouverte), 15 derniers jours, heures UTC ;`,
    `Open-Meteo, modèle Météo-France (AROME puis ARPEGE), 14 jours passés. Écart moyen absolu entre le vent prévu et le vent mesuré (vent moyen 10 min ; rafales = FXI).`, "",
    `| Station | zone de l'appli la plus proche | heures | vent : écart station / zone (km/h) | direction (°, vent ≥ 10 km/h) : station / zone | rafales : station / zone (km/h) |`,
    `|---|---|---|---|---|---|`, ...lignes, "",
    `Lecture : si l'écart « station » est nettement plus petit que l'écart « zone », un point au poste est plus juste qu'un point de zone.`,
    `Limites : 15 jours seulement, une seule saison ; une station à terre n'est pas un bout de digue.`].join("\n");
  fs.writeFileSync(`${out}/stations.md`, md + "\n");
  fs.writeFileSync(`${out}/stations.json`, JSON.stringify(json, null, 1));
  console.log(md);
})().catch(e => { console.error("Erreur :", e.message); fs.writeFileSync(`${out}/stations.md`, "Erreur : " + e.message + "\n"); process.exit(0); });
