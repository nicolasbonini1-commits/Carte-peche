// Houle mesurée par les bouées Candhis (Cerema) d'Espiguette et de Sète, et houle prévue au même endroit.
// Lancé par la tâche GitHub « alertes » ; écrit houle.json dans la branche « donnees », que l'appli lit.
//   node notif/houle.js urls                    → adresses à télécharger (nom, adresse ; « candhis_* » demandent la clé)
//   node notif/houle.js dossier ancien.json     → houle.json sur la sortie (mesures des 48 dernières heures)
// Candhis : API v1, clé dans l'en-tête Authorization (secret CANDHIS_TOKEN), 150 requêtes par jour au plus.
// Ici 2 requêtes par passage (une par bouée). Données sous Licence Ouverte Etalab 2.0 : citer CANDHIS et le Cerema.
// Heure des mesures : la doc ne la précise pas ; lue comme heure UTC (seul indice dans la doc : « 8h TU »), à vérifier.
const fs = require("fs");
const BOUEES = [
  { camp: "03001", nom: "Espiguette", lat: 43.4109993, lon: 4.1624999, fond: 32 }, // getCampInfos, 19 nov. 2026
  { camp: "03404", nom: "Sète", lat: 43.3713, lon: 3.77705, fond: 30 }
];
const H = 48 * 3600000, VIDE = 999.9999;

if (process.argv[2] === "urls") {
  const d = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), f = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  BOUEES.forEach(b => console.log(`candhis_${b.camp} https://candhis.cerema.fr/API/v1/getCampTR.php?camp=${b.camp}&dateDeb=${d}&dateFin=${f}`));
  // Prévision au même endroit que les bouées, mêmes réglages que l'appli (Open-Meteo Marine « best match » = MFWAM), heures en UTC.
  console.log(`prevu_bouees https://marine-api.open-meteo.com/v1/marine?latitude=${BOUEES.map(b => b.lat.toFixed(3)).join(",")}` +
    `&longitude=${BOUEES.map(b => b.lon.toFixed(3)).join(",")}&hourly=wave_height,wave_direction,wave_period&past_days=2&forecast_days=2&timezone=GMT`);
  process.exit(0);
}

const dir = process.argv[2] || ".";
const lire = p => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { return null; } };
const ancien = lire(process.argv[3] || "") || { bouees: [] };
const now = Date.now();
const num = s => { const v = parseFloat(s); return isFinite(v) && Math.abs(v - VIDE) > 1e-6 ? v : null; };
const prevu = lire(`${dir}/prevu_bouees.json`);
const notes = [];

const out = {
  genere: new Date(now).toISOString(),
  source: "CANDHIS – Cerema (Licence Ouverte Etalab 2.0) ; prévision : Open-Meteo Marine",
  heure_mesures: "lue comme heure UTC (à vérifier)",
  bouees: BOUEES.map((b, k) => {
    const j = lire(`${dir}/candhis_${b.camp}.json`);
    const ok = j && (j.success === true || j.success === "True") && Array.isArray(j.results) && Array.isArray(j.entete);
    let mesures;
    if (ok) {
      // Colonnes repérées par leur nom (entete), pas par leur place : Date, H1/3 (m), Hmax (m), TH1/3 (s), Dir. au pic (°), …, Temp. mer (°C)
      const col = re => j.entete.findIndex(e => re.test(e));
      const c = { h: col(/^H1\/3|^Hm0/), hmax: col(/^Hmax/), per: col(/^TH1\/3|^T02/), dir: col(/^Dir/), sst: col(/^Temp/) };
      mesures = j.results.map(r => {
        const t = Date.parse(r[0].replace(" ", "T") + ":00Z");
        const g = i => i >= 0 ? num(r[i]) : null;
        return { t: new Date(t).toISOString(), h: g(c.h), hmax: g(c.hmax), per: g(c.per), dir: g(c.dir), sst: g(c.sst) };
      }).filter(m => isFinite(Date.parse(m.t)) && now - Date.parse(m.t) <= H).sort((a, z) => a.t < z.t ? -1 : 1);
      const der = mesures[mesures.length - 1];
      if (der && Date.parse(der.t) > now + 5 * 60000) notes.push(`${b.nom} : dernière mesure ${der.t} dans le futur si lue en UTC → heure locale probable`);
      if (der) notes.push(`${b.nom} : dernière mesure il y a ${Math.round((now - Date.parse(der.t)) / 60000)} min si lue en UTC`);
    } else {
      notes.push(`${b.nom} : Candhis sans réponse valable (${j ? j.message : "rien reçu"}), mesures précédentes gardées`);
    }
    const old = (ancien.bouees || []).find(x => x.camp === b.camp);
    if (!ok) mesures = old ? old.mesures.filter(m => now - Date.parse(m.t) <= H) : [];
    let pv = [];
    const p = Array.isArray(prevu) ? prevu[k] : null;
    if (p && p.hourly) pv = p.hourly.time.map((t, i) => ({ t: t + ":00Z", h: p.hourly.wave_height[i], dir: p.hourly.wave_direction[i], per: p.hourly.wave_period[i] }))
      .filter(x => x.h != null && Math.abs(Date.parse(x.t) - now) <= H);
    else if (old) pv = old.prevu || [];
    return { camp: b.camp, nom: b.nom, lat: b.lat, lon: b.lon, fond: b.fond, a_jour: !!ok, mesures, prevu: pv };
  }),
  notes
};
process.stdout.write(JSON.stringify(out));
notes.forEach(n => console.error(n));
