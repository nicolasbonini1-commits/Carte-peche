// Postes de pêche, d'est en ouest (Saintes-Maries -> Frontignan).
// Coordonnées : vérifiées le 18 nov. 2026 avec OpenStreetMap (feux des ports, lieux-dits) et la profondeur EMODnet.
// pos = d'où vient la position ; « à vérifier » = à corriger sur place (bouton « Corriger la position » dans la fiche).
// seaward = direction (en degrés, 0 = nord) vers laquelle le poste regarde la mer.
//   Sert à savoir si le vent et la houle arrivent de face (de la mer) ou de dos (de la terre).
// type : embouchure | grau | digue | roche | plage_barres | plage_lisse
// river : fleuve ou rivière qui influence le poste ("rhone", "vidourle", "lez") ou false
// lit : zone éclairée la nuit
// Niveaux de preuve : [S] sourcé, [P] pratique courante / estimation, [C] lecture de carte.
window.SPOTS = [
  {
    id: 1, name: "Embouchure du Petit Rhône", commune: "Saintes-Maries-de-la-Mer", pos: "à vérifier : point sur le trait de côte, embouchure non confirmée par une source",
    lat: 43.4515, lon: 4.3945, type: "embouchure", seaward: 190, river: "rhone", lit: false,
    structure: "Grau d'Orgon, à 2 km à l'ouest du village [S] : mélange eau douce / eau salée, courant. [S] Le bar est euryhalin et fréquente estuaires et embouchures.",
    attention: "Accès par le sable, longue marche selon la rive. Par crue du Rhône, eau très chargée.",
    zone: "E"
  },
  {
    id: 2, name: "Épis et brise-lames du village", commune: "Saintes-Maries-de-la-Mer", pos: "à vérifier : point ~200 m dans les terres d'après la profondeur EMODnet",
    lat: 43.4505, lon: 4.4150, type: "digue", seaward: 185, river: false, lit: true,
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
    id: 4, name: "Pointe et plage de l'Espiguette", commune: "Le Grau-du-Roi", pos: "à vérifier : point dans l'eau, ~3 m de fond, environ 500 m au large de la plage",
    lat: 43.4750, lon: 4.1480, type: "plage_barres", seaward: 165, river: false, lit: false,
    structure: "Sable, barres et cuvettes ; site Natura 2000 « Bancs sableux de l'Espiguette ». [S]",
    attention: "Pêche interdite depuis les plages du 15 juin au 15 septembre, de 9 h à 20 h. [S] Longue marche.",
    zone: "C"
  },
  {
    id: 5, name: "Digue de l'Espiguette (extérieur Port Camargue)", commune: "Le Grau-du-Roi", pos: "à vérifier : point dans l'eau à 500 m au sud de l'entrée du port",
    lat: 43.5165, lon: 4.1210, type: "digue", seaward: 240, river: false, lit: false,
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
    id: 7, name: "Digue et épis du Boucanet", commune: "Le Grau-du-Roi", pos: "à vérifier : point dans l'eau, ~250 m au large",
    lat: 43.5440, lon: 4.1220, type: "digue", seaward: 210, river: false, lit: false,
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
