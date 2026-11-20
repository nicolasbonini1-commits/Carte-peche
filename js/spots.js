// Postes de pêche, d'est en ouest (Saintes-Maries -> Frontignan).
// Coordonnées : vérifiées le 18 nov. 2026 avec OpenStreetMap (feux des ports, lieux-dits) et la profondeur EMODnet.
// pos = d'où vient la position ; « à vérifier » = à corriger sur place (bouton « Corriger la position » dans la fiche).
// seaward = direction (en degrés, 0 = nord) vers laquelle le poste regarde la mer.
//   Sert à savoir si le vent et la houle arrivent de face (de la mer) ou de dos (de la terre).
// type : embouchure | grau | digue | roche | plage_barres | plage_lisse
// river : fleuve ou rivière qui influence le poste ("rhone", "vidourle", "lez") ou false
// lit : zone éclairée la nuit
// autour : 2-3 points voisins (≤ ≈ 1 km) pour une pêche de zone : si rien ne mord, on change d'épi sans changer de secteur.
// Règle de Nico (20 nov. 22 h 34) : les points « autour » doivent être joignables à pied depuis le poste (pas de chenal ni d’estuaire à contourner en voiture).
//   Mêmes conditions que le poste, donc pas de note à part. Chaque point a sa source (src).
// Niveaux de preuve : [S] sourcé, [P] pratique courante / estimation, [C] lecture de carte.
window.SPOTS = [
  {
    id: 1, name: "Embouchure du Petit Rhône", commune: "Saintes-Maries-de-la-Mer", pos: "vérifiée le 20 nov. 2026 : fin du Petit Rhône sur le trait de côte (OpenStreetMap) ; profondeur EMODnet ≈ 0 m à l'embouchure, 3,7 m à 250 m au large",
    // Ancien point (43,4515 / 4,3945) : sur la terre, rive ouest, ≈ 310 m au NO ; Nico (20 nov.) : il fallait traverser l'estuaire à la nage.
    // Source : OSM way 231712579 « Le Petit Rhône » (dernier point) sur le trait de côte way 772046455 ; relevé du 20 nov. (branche essais-postes-donnees).
    lat: 43.44995, lon: 4.39771, type: "embouchure", seaward: 190, river: "rhone", lit: false,
    // autour : accord de Nico le 20 nov. 22 h 34 (tous sur la rive est, joignables à pied).
    autour: [
      { name: "Pointe de la digue rive gauche", lat: 43.44645, lon: 4.40178, src: "OSM way 433543117 (bout côté mer) [C]", note: "510 m au SE, là où l'eau du Petit Rhône rencontre la mer" },
      { name: "Épi du Clos du Rhône", lat: 43.44736, lon: 4.40128, src: "OSM way 433543123 ; SYMADREM épi tenon 175 m [C]", note: "410 m au SE" },
      { name: "Brise-lames du Clos du Rhône", lat: 43.44684, lon: 4.40317, src: "OSM way 433543076 ; SYMADREM Clos du Rhône BL [C]", note: "560 m au SE" }
    ],
    structure: "Grau d'Orgon, à 2 km à l'ouest du village [S] : mélange eau douce / eau salée, courant. [S] Le bar est euryhalin et fréquente estuaires et embouchures.",
    attention: "Pêcher depuis la rive est (côté camping du Clos du Rhône, parking sur la carte OSM) : la rive ouest impose de traverser l'estuaire. Par crue du Rhône, eau très chargée.",
    zone: "E"
  },
  {
    id: 2, name: "Épis et brise-lames du village", commune: "Saintes-Maries-de-la-Mer", pos: "vérifiée le 20 nov. 2026 : pointe de l'épi Launes Est (OpenStreetMap) ; profondeur EMODnet ≈ 0 m au bout, 4,9 m à 240 m au large",
    // Ancien point (43,4505 / 4,415) : sur la route D38 (EMODnet +1,5 m). Accord de Nico le 20 nov. 21 h 25.
    // Source : OSM way 711960175 (man_made=groyne, 174 m) ; nom d'après la longueur dans le tableau SYMADREM (délibération 2023-20, DREAL PACA : Launes Est 170 m) [C].
    lat: 43.44815, lon: 4.41560, type: "digue", seaward: 185, river: false, lit: true,
    // autour = pêche de zone (idée de Nico, 20 nov.) : 3 points au plus à ≈ 1 km, mêmes conditions que le poste (pas de note à part).
    autour: [
      { name: "Épi Launes Ouest", lat: 43.44788, lon: 4.41018, src: "OSM way 433543018 ; SYMADREM Launes Ouest 170 m [C]", note: "même type d'épi, 440 m à l'ouest" },
      { name: "Brise-lames du Clos du Rhône", lat: 43.44766, lon: 4.40610, src: "OSM way 433543074 ; SYMADREM Clos du Rhône BL 125-235 m [C]", note: "770 m à l'ouest ; s'il est détaché de la plage, lancer vers lui depuis le sable" },
      { name: "Digue ouest de Port Gardian", lat: 43.44592, lon: 4.42329, src: "feu rouge OSM 1420666365 = feu Digue W (Fl.R.4s) ; SYMADREM 385 m", note: "670 m à l'est, la plus profonde (4,6 à 5,6 m) ; pêche dans le port : à demander à la capitainerie (04 90 97 85 87)" }
    ],
    structure: "Série d'épis en enrochements et de brise-lames à l'ouest du village. [S] (SYMADREM, DREAL PACA)",
    attention: "Blocs glissants, ne pas s'engager par mer forte.",
    zone: "E"
  },
  {
    id: 3, name: "Rivage sauvage Petit Rhône – Espiguette", commune: "Camargue gardoise", pos: "zone de 15 km, point indicatif ; accès à vérifier",
    lat: 43.4620, lon: 4.2500, type: "plage_barres", seaward: 175, river: false, lit: false,
    structure: "Grande plage de sable sauvage, barres et cuvettes. [S] « Le bar est présent près de la côte de septembre à février » (peche.com, rivage camarguais).",
    attention: "Accès long et isolé : jamais seul de nuit. Aucun abri.",
    zone: "E"
  },
  {
    id: 4, name: "Pointe et plage de l'Espiguette", commune: "Le Grau-du-Roi", pos: "vérifiée le 20 nov. 2026 : bord de mer au droit du phare de l'Espiguette (OpenStreetMap) ; profondeur EMODnet 3,2 m à 250 m au large",
    // Ancien point (43,4750 / 4,1480) : dans l'eau, 200 m au large, 1,1 km au SE. Accord de Nico le 20 nov. 22 h 34.
    // Source : trait de côte OSM le plus proche du Phare de l'Espiguette (node 296911109), 644 m au SO du phare. seaward recalculé : côte orientée 118°, mer au 208°.
    lat: 43.48239, lon: 4.13854, type: "plage_barres", seaward: 208, river: false, lit: false,
    autour: [
      { name: "Plage, 1 km au nord-ouest", lat: 43.48713, lon: 4.12804, src: "trait de côte OSM [C]", note: "même plage, sans ouvrage" },
      { name: "Plage, 1 km au sud-est", lat: 43.47897, lon: 4.15018, src: "trait de côte OSM [C]", note: "même plage, sans ouvrage" }
    ],
    structure: "Sable, barres et cuvettes ; site Natura 2000 « Bancs sableux de l'Espiguette ». [S]",
    attention: "Pêche interdite depuis les plages du 15 juin au 15 septembre, de 9 h à 20 h. [S] Longue marche.",
    zone: "C"
  },
  {
    id: 5, name: "Digue de l'Espiguette (extérieur Port Camargue)", commune: "Le Grau-du-Roi", pos: "vérifiée le 20 nov. 2026 : feu en tête de la digue de l'Espiguette (OpenStreetMap) ; profondeur EMODnet 3 à 4,6 m à 200-300 m",
    // Ancien point (43,5165 / 4,1210) : sur un épi de la plage sud de Port Camargue, 740 m au NNE. Accord de Nico le 20 nov. 22 h 34.
    // Source : la digue de l'Espiguette limite au nord le site Natura 2000 FR9102014 (notice de l'arrêté ZSC) [S] ; feu OSM node 1420666369, digue way 433543104.
    // seaward recalculé : bout de digue tourné vers l'ouest, mer ouverte à l'ouest (270°).
    lat: 43.51076, lon: 4.11645, type: "digue", seaward: 270, river: false, lit: false,
    // Pointe de l'Espiguette (balise node 1420666367, 540 m OSO) écartée par Nico : de l'autre côté du chenal sud, pas joignable à pied.
    autour: [
      { name: "Épi sud de la plage sud de Port Camargue", lat: 43.51400, lon: 4.11963, src: "OSM way 66033925 [C]", note: "440 m au NNE" },
      { name: "Épi nord de la plage sud de Port Camargue", lat: 43.51734, lon: 4.12041, src: "OSM way 66034032 [C]", note: "800 m au NNE" }
    ],
    structure: "Enrochements sur sable à l'extérieur du port. [P]",
    attention: "Pêche interdite dans la plupart des ports : rester à l'extérieur. [S]",
    zone: "C"
  },
  {
    id: 6, name: "Jetées du chenal du Grau-du-Roi", commune: "Le Grau-du-Roi", pos: "feu vert de la jetée du chenal (OpenStreetMap, balisage) [S]",
    lat: 43.5347, lon: 4.1323, type: "grau", seaward: 220, river: "vidourle", lit: true,
    structure: "Débouché commun du Vidourle et du chenal maritime : courant, éclairage. [S]",
    attention: "Pêche de loisir de nouveau autorisée dans le port depuis juillet 2025, sous conditions : lire le règlement du port. [S]",
    zone: "C"
  },
  {
    id: 7, name: "Digue et épis du Boucanet", commune: "Le Grau-du-Roi", pos: "vérifiée le 20 nov. 2026 : bout d'un épi du Boucanet (OpenStreetMap) ; profondeur EMODnet 3,4 m à 250 m au large",
    // Ancien point (43,5440 / 4,1220) : 37 m du bout de l'épi. OSM ne montre aucune « digue » ici, seulement des épis ≈ tous les 250 m. Accord de Nico le 20 nov. 22 h 34.
    // Source : OSM way 66035454 (man_made=groyne). seaward recalculé : côte orientée 315°, mer au 225°.
    lat: 43.54420, lon: 4.12236, type: "digue", seaward: 225, river: false, lit: false,
    autour: [
      { name: "Épi suivant (NO)", lat: 43.54636, lon: 4.11937, src: "OSM way 66035464 [C]", note: "340 m vers La Grande-Motte" },
      { name: "2e épi (NO)", lat: 43.54795, lon: 4.11711, src: "OSM way 291336576 [C]", note: "595 m" },
      { name: "3e épi (NO)", lat: 43.54906, lon: 4.11464, src: "OSM way 66035467 [C]", note: "825 m" }
    ],
    structure: "Enrochements sur sable, pointes d'épis. [P]",
    attention: "Blocs glissants.",
    zone: "C"
  },
  {
    id: 8, name: "Passe du Ponant (Vidourle)", commune: "La Grande-Motte", pos: "à vérifier : point dans les terres, passe non trouvée dans une source",
    lat: 43.5565, lon: 4.1060, type: "grau", seaward: 170, river: "vidourle", lit: false,
    structure: "Le Vidourle rejoint la mer en alimentant l'étang du Ponant : sortie d'étang. [S]",
    attention: "Courant fort par crue.",
    zone: "C"
  },
  {
    id: 9, name: "Digues extérieures et « digue cassée »", commune: "La Grande-Motte", pos: "à vérifier : emplacement de la « digue cassée » non trouvé dans une source",
    lat: 43.5555, lon: 4.0880, type: "digue", seaward: 170, river: false, lit: true,
    structure: "Enrochements et brise-lames face au casino. [S]",
    attention: "Plages de La Grande-Motte : aucune restriction du 1er novembre au 30 avril. [S]",
    zone: "C"
  },
  {
    id: 10, name: "Plages du Grand et du Petit Travers", commune: "La Grande-Motte / Carnon", pos: "plage, point sur le trait de côte entre Petit et Grand Travers",
    lat: 43.5530, lon: 4.0150, type: "plage_lisse", seaward: 165, river: false, lit: false,
    structure: "Grande plage peu profonde. [S] Suivi 2023 : petites barres disparues vers Carnon et Le Couchant, pente lisse (Département de l'Hérault).",
    attention: "Peu de fond : leurres légers ou peu plongeants.",
    zone: "C"
  },
  {
    id: 11, name: "Digues du port de Carnon", commune: "Mauguio-Carnon", pos: "feu rouge « Carnon » en tête de digue (OpenStreetMap, balisage) [S]",
    lat: 43.5399, lon: 3.9772, type: "grau", seaward: 160, river: false, lit: true,
    structure: "Sortie de port reliée aux étangs (courant étang-mer). [S]",
    attention: "Rester à l'extérieur du port.",
    zone: "W"
  },
  {
    id: 12, name: "Embouchure du Lez et digues", commune: "Palavas-les-Flots", pos: "feu vert en tête de la jetée ouest du Lez (OpenStreetMap, balisage) [S]",
    lat: 43.5237, lon: 3.9353, type: "grau", seaward: 155, river: "lez", lit: true,
    structure: "Embouchure du Lez, blocs posés sur le sable. [S] Plateau rocheux de Palavas-Carnon au large : un banc à 4-6 m, un second à 10-15 m (ZNIEFF). [S]",
    attention: "Plage des Épis : restriction horaire en saison seulement. [S]",
    zone: "W"
  },
  {
    id: 13, name: "Digue de l'étang du Prévost", commune: "Palavas-les-Flots", pos: "poste de secours du Grau du Prévost (OpenStreetMap) [S], à côté du grau",
    lat: 43.5185, lon: 3.9101, type: "grau", seaward: 155, river: false, lit: false,
    structure: "Digue au débouché de l'étang du Prévost. [S] Le Prévost est une lagune suivie pour les migrations de la daurade (Ifremer). [S]",
    attention: "Dangereuse quand la mer tape fort. [S]",
    zone: "W"
  },
  {
    id: 14, name: "Plage de Maguelone", commune: "Villeneuve-lès-Maguelone", pos: "plage, point sur le trait de côte près du poste de secours du Pilou",
    lat: 43.5050, lon: 3.8780, type: "plage_barres", seaward: 150, river: false, lit: false,
    structure: "Plage sableuse ; formation de petites barres d'avant-côte observée en 2023. [S]",
    attention: "Accès par navette ou à pied en saison.",
    zone: "W"
  },
  {
    id: 15, name: "Les Aresquiers (fonds rocheux)", commune: "Vic-la-Gardiole / Frontignan", pos: "plage des Aresquiers, point sur le trait de côte",
    lat: 43.4660, lon: 3.8260, type: "roche", seaward: 140, river: false, lit: false,
    structure: "Plateau rocheux des Aresquiers, posidonies ; filières de moules au large où la daurade se concentre. [S] (FAO ArtFiMed)",
    attention: "Roches glissantes, posidonies protégées (Natura 2000 « Posidonies de la côte palavasienne »).",
    zone: "W"
  },
  {
    id: 16, name: "Digues et grau de Frontignan", commune: "Frontignan", pos: "feu rouge en tête de digue du port de Frontignan (OpenStreetMap, balisage) [S]",
    lat: 43.4303, lon: 3.7775, type: "grau", seaward: 140, river: false, lit: true,
    structure: "Digues du port de Frontignan-plage. [C] Liaison avec les étangs à vérifier sur place. Filières de moules au large entre Frontignan et Agde. [S]",
    attention: "Rester à l'extérieur du port.",
    zone: "W"
  }
];

// Points météo / mer. W = Frontignan-Palavas, C = golfe d'Aigues-Mortes, E = Petite Camargue.
// Les points « mer » sont un peu au large pour tomber dans une maille marine du modèle de houle.
window.WX_POINTS = {
  W: { name: "Frontignan – Palavas", land: [43.50, 3.88], sea: [43.44, 3.90] },
  C: { name: "Golfe d'Aigues-Mortes", land: [43.54, 4.08], sea: [43.48, 4.06] },
  E: { name: "Petite Camargue", land: [43.46, 4.30], sea: [43.40, 4.30] },
  RV: { name: "Bassin du Vidourle (pluie)", land: [43.90, 3.92] },
  RL: { name: "Bassin du Lez (pluie)", land: [43.70, 3.86] }
};
// Points pluie : RV = haut Vidourle, entre Saint-Hippolyte-du-Fort et Sommières (les crues du Vidourle viennent surtout des pluies sur les Cévennes) [P] ;
// RL = nord de Montpellier, sur le bassin du Lez [C]. Le Rhône est suivi par son débit (bassin trop grand pour un point de pluie).

// Stations de débit (Hub'Eau, réseau Vigicrues), choisies au plus près de la mer parmi celles qui mesurent le débit
// (vérifié le 18 nov. 2026 : Beaucaire, Fourques et Arles ne donnent pas de débit horaire). Débit reçu en l/s → div 1000.
// Le Petit Rhône n'a pas de station de débit : on suit le Rhône à Tarascon, avant la séparation des deux bras.
window.RIVERS = {
  rhone: { name: "Rhône à Tarascon", station: "V720001002", div: 1000 },
  vidourle: { name: "Vidourle à Gallargues", station: "Y346400501", div: 1000 },
  lez: { name: "Lez à Lattes", station: "Y321002001", div: 1000 }
};

// Point de départ par défaut (coordonnées approximatives de Poulx)
window.HOME = { name: "Poulx", lat: 43.909, lon: 4.418 };

// Webcams proches des postes (ajout du 18 nov. 2026), pour voir la couleur de l'eau après la pluie, de jour seulement.
// Lien qui s'ouvre dans le navigateur : pas d'image intégrée (droits des fournisseurs, poids des vidéos).
// D'où vient chaque adresse : trouvée dans une recherche web le 18 nov. (Viewsurf : annuaire bord-de-mer.com ;
// Roundshot : même annuaire ; Windy, Windfinder, Surf-Forecast : pages de ces sites). Aucune n'a pu être ouverte
// depuis le chat : emplacement exact et orientation vers la mer À VÉRIFIER de jour sur le téléphone.
// Retour de Nico le 19 nov. (21 h 34), sur l'A55 : Palavas rive gauche et rive droite OK ; Saintes-Maries (Surf-Forecast),
// Grau-du-Roi « Live » (Windy) et Espiguette (Windfinder) ne marchent pas → retirées le 20 nov. (postes 1 à 7 sans webcam).
// Retour de Nico le 20 nov. (17 h 27) : La Grande-Motte (Roundshot) hors ligne, dernière image du 14 oct. 2026 → retirée
// (à revérifier plus tard : grandemotte.roundshot.com/port-ouest/) ; Carnon (Windy) OK ; le lien « Maguelone » (Windfinder)
// ne montrait que les 2 webcams de Palavas → retiré, le poste 14 renvoie à Palavas rive droite (côté Maguelone, ≈ 5 km).
(function () {
  const C = {
    carnon:  { label: "Port de Carnon (Windy)", url: "https://www.windy.com/webcams/1724960038" },
    palG:    { label: "Palavas rive gauche (Viewsurf)", url: "https://pv.viewsurf.com/1510/Palavas-rive-gauche" },
    palD:    { label: "Palavas rive droite (Viewsurf)", url: "https://pv.viewsurf.com/1512/Palavas-rive-droite" },
    palDloin: { label: "Palavas rive droite, à ≈ 5 km (Viewsurf)", url: "https://pv.viewsurf.com/1512/Palavas-rive-droite" }
  };
  // Numéro du poste -> webcams, la plus proche d'abord. Postes 1 à 9 : webcams retirées (ne marchent pas) ; 15 et 16 : aucune trouvée.
  const BY_SPOT = { 10: ["carnon"], 11: ["carnon"], 12: ["palG", "palD"], 13: ["palD", "palG"], 14: ["palDloin"] };
  window.SPOTS.forEach(s => { s.webcams = (BY_SPOT[s.id] || []).map(k => C[k]); });
})();
