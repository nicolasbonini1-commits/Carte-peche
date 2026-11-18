// Calcule les alertes des 3 prochains jours avec le même code que l'appli (js/model.js, js/data.js)
// et écrit alertes.json, lu par Home Assistant pour envoyer les notifications.
// Lancé par la tâche GitHub « alertes » toutes les 3 h.
//   node notif/alertes.js urls            → affiche les adresses à télécharger (la tâche les télécharge avec curl)
//   node notif/alertes.js ancien.json dossier > alertes.json   → calcule à partir des fichiers fc_mf.json (ou fc.json) et marine.json du dossier
// Fuseau : la tâche fixe TZ=Europe/Paris, sinon les heures d'Open-Meteo seraient lues en heure UTC.
const fs = require("fs");
global.window = {};
require("../js/spots.js");
const M = require("../js/model.js");
const DATA = require("../js/data.js");

// Notifier : coups de mer, vents forts, fortes pluies (niveau 2 ou 3) et la mer qui retombe (bon créneau).
const notifiable = a => a.level >= 2 || a.kind === "chance";

(async () => {
  const U = DATA.urls(window.WX_POINTS);
  if (process.argv[2] === "urls") { console.log(`fc_mf ${U.forecastModels}\nfc ${U.forecast}\nmarine ${U.marine}`); return; }
  const prev = fs.existsSync(process.argv[2] || "") ? JSON.parse(fs.readFileSync(process.argv[2], "utf8")) : { alertes: [] };
  const dir = process.argv[3] || ".";
  const read = n => { try { const j = JSON.parse(fs.readFileSync(`${dir}/${n}.json`, "utf8")); return Array.isArray(j) ? j : null; } catch (e) { return null; } };
  let f = read("fc_mf"), multi = true;
  if (!f) { multi = false; f = read("fc"); }
  const s = read("marine");
  if (!f || !s) throw new Error("données météo ou mer manquantes");
  const D = DATA.parse({ at: Date.now(), f, s, multi });
  const now = new Date();
  const list = M.alerts(D, now).map(a => ({ level: a.level, kind: a.kind, title: a.title, text: a.text, debut: D.keys[a.i] }));
  // Même alerte qu'au passage précédent = même titre et début à moins de 12 h d'écart (la prévision bouge un peu).
  const seen = a => prev.alertes.some(p => p.title === a.title && Math.abs(Date.parse(p.debut) - Date.parse(a.debut)) <= 12 * 3600000);
  list.forEach(a => { a.notifier = notifiable(a); a.nouvelle = a.notifier && !seen(a); });
  const icon = { mer: "🌊", chance: "🎣", vent: "💨", pluie: "🌧️", fiabilite: "❔" };
  const nouv = list.filter(a => a.nouvelle);
  const out = {
    genere: now.toISOString(),
    modele: multi ? "Météo-France puis ECMWF" : "modèle par défaut d'Open-Meteo",
    nouvelles: nouv.length,
    message: nouv.map(a => `${icon[a.kind] || ""} ${a.title} : ${a.text}`).join("\n").slice(0, 900),
    alertes: list
  };
  process.stdout.write(JSON.stringify(out, null, 1));
})().catch(e => { console.error("Erreur :", e.message); process.exit(1); });
