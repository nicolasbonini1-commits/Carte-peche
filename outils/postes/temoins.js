// Chantier 1 (21 nov. 2026) : cas témoins pour contrôler la méthode « joignable par le bord » (cote.js).
// À relancer après toute modification de cote.js : node outils/postes/temoins.js dossier_des_releves
// (dossier = copie de la branche essais-postes-donnees : poste_*.json, verif_*.json).
// Chaque cas a une réponse connue : vue par Nico sur place, ou sur la photo aérienne du 21 nov. (vue_*.png).
const C = require("./cote.js");
const dossier = process.argv[2] || "/tmp/pd";
const { cote, eaux, feux } = C.charger(dossier), L = C.lignes(cote);
const cas = [
  // [nom, P, X, avis attendu (« joignable » ou « à écarter »), d'où vient la réponse]
  ["Poste 5 : digue de l'Espiguette → pointe (balise cardinale ouest)", { lat: 43.51076, lon: 4.11645 }, { lat: 43.50904, lon: 4.11017 }, "à écarter", "Nico, 20 nov. : chenal sud, il faut reprendre la voiture"],
  ["Poste 1 : rive est (épi du Clos du Rhône) → ancien point rive ouest", { lat: 43.44736, lon: 4.40128 }, { lat: 43.4515, lon: 4.3945 }, "à écarter", "Nico, 20 nov. : traverser l'estuaire à la nage"],
  ["Poste 7 : deux épis voisins du Boucanet (340 m)", { lat: 43.54420, lon: 4.12236 }, { lat: 43.54636, lon: 4.11937 }, "joignable", "photo : même plage"],
  ["Poste 6 : jetée rive gauche → jetée rive droite du chenal (67 m)", { lat: 43.53468, lon: 4.13225 }, { lat: 43.53519, lon: 4.13181 }, "à écarter", "photo : chenal du Grau-du-Roi entre les deux"],
  ["Poste 13 : jetée ouest → jetée est du grau du Prévost (49 m)", { lat: 43.51802, lon: 3.91524 }, { lat: 43.51846, lon: 3.91525 }, "à écarter", "photo : grau entre les deux (pont à ≈ 350 m)"],
  ["Poste 12 : jetée rive gauche du Lez → môle rive droite (80 m)", { lat: 43.52598, lon: 3.93449 }, { lat: 43.52567, lon: 3.93539 }, "à écarter", "photo : sortie du Lez entre les deux"],
  ["Poste 8 : jetée ouest du grau des Abîmes → 1er épi du Boucanet", { lat: 43.55286, lon: 4.09911 }, { lat: 43.55295, lon: 4.10341 }, "à écarter", "photo : grau des Abîmes entre les deux (pont à ≈ 300 m)"],
  ["Poste 16 : jetée ouest (feu rouge) → jetée est (feu vert) de Frontignan", { lat: 43.43031, lon: 3.77745 }, { lat: 43.42950, lon: 3.77753 }, "à écarter", "photo : chenal du port entre les deux ; OSM ne dessine pas ce chenal : repéré par les deux feux en face"],
  ["Poste 11 : digue ouest (feu rouge) → brise-lames est de Carnon", { lat: 43.53989, lon: 3.97724 }, { lat: 43.54293, lon: 3.97851 }, "à écarter", "photo : entrée du port entre les deux, pont à ≈ 800 m"]
];
let ok = 0;
for (const [nom, P, X, attendu, source] of cas) {
  const r = C.analyser(L, eaux, P, X, null, feux);
  const bon = r.avis.startsWith(attendu === "joignable" ? "joignable" : "à écarter") || (attendu === "à écarter" && r.avis.includes("contournant"));
  if (bon) ok++;
  console.log(`${bon ? "OK " : "FAUX"} ${nom}\n     méthode : ${r.avis} — ${r.pourquoi}\n     attendu : ${attendu} (${source})`);
}
console.log(`\n${ok} / ${cas.length} cas conformes.`);
