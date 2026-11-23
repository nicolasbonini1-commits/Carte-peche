// Robot vidéos pêche — tri des vidéos (v3, 23 nov. 2026 au soir).
// Deux façons de le lancer :
//   - passage de la semaine : lit les flux RSS publics des chaînes de chaines.json (15 dernières vidéos chacune, sans clé) ;
//   - à la demande : variable VIDEO = un lien YouTube (ou plusieurs, séparés par des espaces) choisi par Nico.
// Règles (regles.json) : Méditerranée, de Valras à Fos, cœur Frontignan → Saintes-Maries / Port-Saint-Louis, pêche du bord seulement.
// Écrit dans /tmp/sortie : CANDIDATES.md (lecture sur téléphone), a_analyser.json (vidéos retenues), candidates.json (tout), journal.json.
// Interdits : aucune page YouTube lue, aucune vidéo téléchargée, aucun nom de commentateur.
const fs = require("fs");
const D = __dirname;
const R = JSON.parse(fs.readFileSync(`${D}/regles.json`, "utf8"));

// Texte comparable : minuscules, sans accents, ponctuation → espaces (mot entier).
const norme = s => " " + (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9#]+/g, " ").trim() + " ";
const trouve = (t, liste) => liste.filter(m => {
  const prefixe = m.endsWith("*");
  const n = norme(prefixe ? m.slice(0, -1) : m).trim();
  return t.includes(" " + n + (prefixe ? "" : " "));
});

function trier(v) {
  const tt = norme(v.titre), td = norme(v.desc), t = norme(v.titre + " " + v.desc);
  const m = {};
  for (const k of ["coeur", "elargi", "espece", "poste", "mer", "hors_zone", "bateau_kayak", "autres_exclusions"]) m[k] = trouve(t, R[k]);
  const cap = n => Math.min(n, R.plafond_par_famille);
  let score = 0;
  for (const k of Object.keys(R.poids)) score += cap(m[k].length) * R.poids[k];
  // Un mot interdit dans le TITRE écarte la vidéo. Dans la description seule (souvent un texte répété sous toutes les vidéos
  // d'une chaîne : sponsor, matériel, prochaines sorties), il ne crée qu'un doute, vérifié ensuite sur l'image.
  const auTitre = k => trouve(tt, R[k]);
  const duBord = trouve(tt, ["du bord", "bord de mer", "depuis le bord", "entre les bateaux"]).length > 0;
  const doutes = [];
  let ecartee = null;
  if (trouve(t, ["#shorts", "#short"]).length) ecartee = "format court (#shorts)";
  else if (auTitre("bateau_kayak").length && !duBord) ecartee = "bateau ou kayak : " + auTitre("bateau_kayak").join(", ");
  else if (auTitre("autres_exclusions").length) ecartee = "exclu : " + auTitre("autres_exclusions").join(", ");
  else if (auTitre("hors_zone").length && !trouve(tt, R.coeur).length && !trouve(tt, R.elargi).length) ecartee = "hors zone : " + auTitre("hors_zone").join(", ");
  else if (!m.coeur.length && !m.elargi.length && !m.espece.length) ecartee = "ni lieu ni espèce dans le texte";
  if (!ecartee) {
    if (m.bateau_kayak.length && !duBord) doutes.push("bateau/kayak cité dans la description : " + m.bateau_kayak.join(", "));
    if (m.autres_exclusions.length) doutes.push("cité dans la description : " + m.autres_exclusions.join(", "));
    if (m.hors_zone.length) doutes.push("lieu hors zone cité dans la description : " + m.hors_zone.join(", "));
    score -= 2 * doutes.length;
  }
  const secteur = m.coeur.length ? "cœur" : m.elargi.length ? "élargi" : "lieu non écrit";
  return { ...v, score: ecartee ? 0 : score, secteur, ecartee, doutes, mots: m };
}

const idDe = s => (s.match(/(?:v=|youtu\.be\/|shorts\/|live\/)([\w-]{11})/) || s.match(/^([\w-]{11})$/) || [])[1];

async function main() {
  const OUT = "/tmp/sortie"; fs.mkdirSync(OUT, { recursive: true });
  const chaines = JSON.parse(fs.readFileSync(`${D}/chaines.json`, "utf8"));
  const UA = "Carte-peche-robot/0.3 (usage perso ; github.com/nicolasbonini1-commits/Carte-peche)";
  const journal = [];
  const dec = s => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  async function get(url) {
    for (let essai = 1; essai <= 3; essai++) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { "User-Agent": UA } });
        const t = await r.text();
        journal.push({ url: url.replace(/key=[^&]+/, "key=***"), essai, code: r.status, octets: t.length });
        if (r.ok) return t;
        if (r.status === 404) return null;
      } catch (e) { journal.push({ url, essai, erreur: e.message }); }
      await new Promise(r => setTimeout(r, 3000 * essai));
    }
    return null;
  }
  // Vidéos déjà proposées les semaines précédentes (fichier gardé dans la branche de sortie) : jamais reproposées.
  const vues = fs.existsSync("/tmp/vues.json") ? JSON.parse(fs.readFileSync("/tmp/vues.json", "utf8")) : {};
  const demandees = (process.env.VIDEO || "").split(/\s+/).map(idDe).filter(Boolean);
  const mode = demandees.length ? "à la demande" : "passage de la semaine";
  let videos = [];

  if (demandees.length) {
    // À la demande : titre et chaîne par l'oEmbed officiel ; description par l'API YouTube Data si la clé existe.
    for (const id of demandees) {
      const lien = `https://www.youtube.com/watch?v=${id}`;
      let v = { id, lien, titre: "", desc: "", date: "", chaine: "", demandee: true };
      const o = await get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(lien)}`);
      if (o) { const j = JSON.parse(o); v.titre = j.title || ""; v.chaine = j.author_name || ""; }
      if (process.env.YOUTUBE_API_KEY) {
        const a = await get(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${process.env.YOUTUBE_API_KEY}`);
        const s = a && JSON.parse(a).items?.[0]?.snippet;
        if (s) Object.assign(v, { titre: s.title, desc: s.description || "", date: (s.publishedAt || "").slice(0, 10), chaine: s.channelTitle });
      }
      videos.push(trier(v));
    }
  } else {
    for (const c of chaines) {
      const x = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${c.id}`);
      if (!x) { journal.push({ chaine: c.nom, erreur: "flux illisible" }); continue; }
      for (const e of x.split("<entry>").slice(1)) {
        const g = re => (e.match(re) || [])[1] || "";
        const id = g(/<yt:videoId>(.*?)<\/yt:videoId>/);
        videos.push(trier({ id, lien: `https://www.youtube.com/watch?v=${id}`, titre: dec(g(/<title>(.*?)<\/title>/)),
          date: g(/<published>(.*?)<\/published>/).slice(0, 10), desc: dec(g(/<media:description>([\s\S]*?)<\/media:description>/)), chaine: c.nom }));
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  const rang = { "cœur": 0, "élargi": 1, "lieu non écrit": 2 };
  videos.sort((a, b) => (!!a.ecartee - !!b.ecartee) || rang[a.secteur] - rang[b.secteur] || b.score - a.score || b.date.localeCompare(a.date));
  // Retenues : à la demande, toujours (c'est Nico qui choisit, on signale seulement un doute) ; sinon les meilleures nouvelles au-dessus du seuil.
  const retenues = demandees.length ? videos
    : videos.filter(v => !v.ecartee && v.score >= R.seuil && !vues[v.id]).slice(0, R.max_par_passage);
  for (const v of retenues) vues[v.id] = new Date().toISOString().slice(0, 10);

  const quand = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  fs.writeFileSync(`${OUT}/a_analyser.json`, JSON.stringify({ mode, le: new Date().toISOString(), videos: retenues.map(({ mots, ...v }) => v) }, null, 1));
  fs.writeFileSync(`${OUT}/candidates.json`, JSON.stringify({ mode, le: new Date().toISOString(), videos }, null, 1));
  fs.writeFileSync(`${OUT}/vues.json`, JSON.stringify(vues, null, 1));
  fs.writeFileSync(`${OUT}/journal.json`, JSON.stringify(journal, null, 1));
  const ligne = v => `| ${v.score} | ${v.secteur} | ${v.date} | ${v.chaine} | [${(v.titre || "(sans titre)").replace(/\|/g, "/")}](${v.lien}) | ${[...v.mots.coeur, ...v.mots.elargi].join(", ")} | ${v.doutes.join(" ; ")} |`;
  const L = [`# Robot pêche — ${mode} — ${quand}`, "",
    `Vidéos lues : ${videos.length}. Retenues pour l'analyse : ${retenues.length}${demandees.length ? "" : ` (au plus ${R.max_par_passage}, score ≥ ${R.seuil}, jamais proposées avant)`}.`, "",
    "## Retenues", "", "| score | secteur | date | chaîne | titre | lieux lus | doutes |", "| --- | --- | --- | --- | --- | --- | --- |", ...retenues.map(ligne), "",
    "## Gardées mais pas retenues cette fois", "", "| score | secteur | date | chaîne | titre | lieux lus | doutes |", "| --- | --- | --- | --- | --- | --- | --- |",
    ...videos.filter(v => !v.ecartee && !retenues.includes(v)).slice(0, 25).map(ligne), "",
    "## Écartées (raison)", "", ...videos.filter(v => v.ecartee).map(v => `- ${v.chaine} — ${(v.titre || "(sans titre)").slice(0, 70)} → ${v.ecartee}`)];
  if (demandees.length) L.splice(4, 0, "À la demande : la vidéo est analysée même si le texte signale un doute (voir « secteur » et « Écartées »).", "");
  fs.writeFileSync(`${OUT}/CANDIDATES.md`, L.join("\n") + "\n");
  console.log(mode, "| lues", videos.length, "| retenues", retenues.length, "| écartées", videos.filter(v => v.ecartee).length);
}

if (require.main === module) main();
module.exports = { trier, norme, trouve, idDe };
