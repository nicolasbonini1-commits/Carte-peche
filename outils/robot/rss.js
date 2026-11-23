// Robot vidéos pêche, version « texte seulement » (23 nov. 2026, branche essai-robot).
// Lit les flux RSS publics des chaînes (15 dernières vidéos chacune, sans clé), trie par mots-clés et par zone,
// et écrit dans /tmp/sortie : candidates.json (tout) + CANDIDATES.md (lecture sur téléphone) + journal.json.
// Règles : ni page YouTube, ni vidéo téléchargée (seulement les flux RSS officiels) ; aucun nom de commentateur ; rien vers Notion.
const fs = require("fs");
const OUT = "/tmp/sortie"; fs.mkdirSync(OUT, { recursive: true });
const D = __dirname;
const chaines = JSON.parse(fs.readFileSync(`${D}/chaines.json`, "utf8"));
const R = JSON.parse(fs.readFileSync(`${D}/regles.json`, "utf8"));
const UA = "Carte-peche-robot/0.1 (usage perso ; github.com/nicolasbonini1-commits/Carte-peche)";
const journal = [];
const sans = s => " " + s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'") + " ";
const dec = s => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
async function get(url) {
  const t0 = Date.now();
  for (let essai = 1; essai <= 3; essai++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { "User-Agent": UA } });
      const t = await r.text();
      journal.push({ url, essai, code: r.status, s: (Date.now() - t0) / 1000, octets: t.length });
      if (r.ok) return t;
    } catch (e) { journal.push({ url, essai, erreur: e.message }); }
    await new Promise(r => setTimeout(r, 3000 * essai));
  }
  return null;
}
(async () => {
  const toutes = [];
  for (const c of chaines) {
    const x = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${c.id}`);
    if (!x) { toutes.push({ chaine: c.nom, erreur: "flux illisible" }); continue; }
    for (const e of x.split("<entry>").slice(1)) {
      const g = re => (e.match(re) || [])[1] || "";
      const v = { id: g(/<yt:videoId>(.*?)<\/yt:videoId>/), titre: dec(g(/<title>(.*?)<\/title>/)), date: g(/<published>(.*?)<\/published>/).slice(0, 10),
        desc: dec(g(/<media:description>([\s\S]*?)<\/media:description>/)), vues: +g(/<media:statistics views="(\d+)"/) || 0, chaine: c.nom, statut_chaine: c.statut };
      const t = sans(v.titre + " " + v.desc);
      const hits = {}; let score = 0;
      for (const k of ["zone", "hors_zone_proche", "espece", "poste", "exclure"]) {
        hits[k] = R[k].filter(m => t.includes(" " === m.slice(-1) ? sans(m).slice(0, -1) : sans(m).trim()));
        score += Math.min(hits[k].length, k === "exclure" ? 3 : 3) * R.poids[k];
      }
      if (!hits.espece.length) score = Math.min(score, 0); // pas de pêche visible dans le texte → écartée
      v.score = score; v.mots = hits;
      v.lien = `https://www.youtube.com/watch?v=${v.id}`;
      v.court = /#shorts?\b/i.test(v.titre + v.desc);
      toutes.push(v);
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  const videos = toutes.filter(v => v.id).sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));
  fs.writeFileSync(`${OUT}/candidates.json`, JSON.stringify({ lu_le: new Date().toISOString(), erreurs: toutes.filter(v => v.erreur), videos }, null, 1));
  const L = [`# Candidates du robot (texte seulement) — ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`, "",
    `Chaînes lues : ${chaines.length - toutes.filter(v => v.erreur).length}/${chaines.length}. Vidéos : ${videos.length}. Score = 3 × lieux de la zone + 1 × lieux proches + 1 × espèce/technique + 1 × type de poste − 5 × exclusions (plafond 3 mots par famille) ; 0 si aucun mot d'espèce ou de technique. Poids à discuter.`, "",
    "| score | date | chaîne | titre | lieux trouvés | exclusions |", "| --- | --- | --- | --- | --- | --- |"];
  for (const v of videos.filter(v => v.score >= 3)) L.push(`| ${v.score} | ${v.date} | ${v.chaine} | [${v.titre.replace(/\|/g, "/")}](${v.lien}) | ${[...v.mots.zone, ...v.mots.hors_zone_proche].join(", ")} | ${v.mots.exclure.join(", ")} |`);
  fs.writeFileSync(`${OUT}/CANDIDATES.md`, L.join("\n") + "\n");
  fs.writeFileSync(`${OUT}/journal.json`, JSON.stringify(journal, null, 1));
  console.log("vidéos", videos.length, "score>=3", videos.filter(v => v.score >= 3).length, "erreurs", toutes.filter(v => v.erreur).length);
})();
