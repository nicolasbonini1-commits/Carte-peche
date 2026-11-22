// Lit les réponses téléchargées par la tâche taille-vent et résume : taille compressée (ce que le téléphone télécharge),
// taille brute (ce que l'appli garde dans le téléphone), temps, contrôle du contenu (16 postes, 2 modèles, trous).
const fs = require("fs"), zlib = require("zlib"), dir = process.argv[2];
const lignes = fs.readFileSync(`${dir}/temps.txt`, "utf8").trim().split("\n").map(l => l.split(" "));
const out = [];
for (const [tour, nom, code, octets, temps] of lignes) {
  const f = `${dir}/${nom}_${tour}.gz`; let brut = null, ctrl = "";
  try {
    const buf = fs.readFileSync(f), txt = (buf[0] === 0x1f ? zlib.gunzipSync(buf) : buf).toString();
    brut = txt.length; const j = JSON.parse(txt), a = Array.isArray(j) ? j : [j];
    const h = a[0].hourly || {}, cles = Object.keys(h).filter(k => k !== "time");
    const trous = cles.map(k => a.reduce((n, p) => n + (p.hourly[k] || []).filter(v => v == null).length, 0));
    ctrl = `${a.length} points, ${h.time ? h.time.length : 0} h, ${cles.length} séries, valeurs vides par série : ${cles.map((k, i) => k.replace("_meteofrance_seamless", "·MF").replace("_ecmwf_ifs025", "·EC") + "=" + trous[i]).join(" ")}`;
  } catch (e) { ctrl = "lecture impossible : " + e.message; }
  out.push(`| ${tour} | ${nom} | ${code} | ${(octets / 1024).toFixed(0)} Ko | ${brut != null ? (brut / 1024).toFixed(0) + " Ko" : "?"} | ${(+temps).toFixed(1)} s | ${ctrl} |`);
}
const md = ["| tour | requête | HTTP | téléchargé (compressé) | brut (gardé dans le téléphone) | temps | contenu |", "|---|---|---|---|---|---|---|", ...out].join("\n");
fs.writeFileSync(`${dir}/RESULTAT.md`, `# Taille de la requête « vent au poste » (${new Date().toISOString()})\n\n${md}\n`);
console.log(md);
