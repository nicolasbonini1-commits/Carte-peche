// Postes de pêche, d'est en ouest (Saintes-Maries -> Frontignan).
// Coordonnées : vérifiées (Grau d'Orgon, phare de l'Espiguette, Aresquiers) ou estimées pour les autres : à corriger sur place (bouton « Corriger la position » dans la fiche).
// seaward = direction (en degrés, 0 = nord) vers laquelle le poste regarde la mer.
//   Sert à savoir si le vent et la houle arrivent de face (de la mer) ou de dos (de la terre).
// type : embouchure | grau | digue | roche | plage_barres | plage_lisse
// river : fleuve ou rivière qui influence le poste ("rhone", "vidourle", "lez") ou false
// lit : zone éclairée la nuit
// Niveaux de preuve : [S] sourcé, [P] pratique courante / estimation, [C] lecture de carte.
window.SPOTS = [
  {
    id: 1, name: "Embouchure du Petit Rhône", commune: "Saintes-Maries-de-la-Mer",
    lat: 43.4515, lon: 4.3945, type: "embouchure", seaward: 190, river: "rhone", lit: false,
    structure: "Grau d'Orgon, à 2 km à l'ouest du village [S] : mélange eau douce / eau salée, courant. [S] Le bar est euryhalin et fréquente estuaires et embouchures.",
    attention: "Accès par le sable, longue marche selon la rive. Par crue du Rhône, eau très chargée.",
    zone: "E"
  },
  {
    id: 2, name: "Épis et brise-lames du village", commune: "Saintes-Maries-de-la-Mer",
    lat: 43.4505, lon: 4.4150, type: "digue", seaward: 185, river: false, lit: true,
    structure: "Série d'épis en enrochements et de brise-lames à l'ouest du village. [S] (SYMADREM, DREAL PACA)",
    attention: "Blocs glissants, ne pas s'engager par mer forte.",
    zone: "E"
  },
  {
    id: 3, name: "Rivage sauvage Petit Rhône – Espiguette", commune: "Camargue gardoise",
    lat: 43.4620, lon: 4.2500, type: "plage_barres", seaward: 175, river: false, lit: false,
    structure: "Grande plage de sable sauvage, barres et cuvettes. [S] « Le bar est présent près de la côte de septembre à février » (peche.com, rivage camarguais).",
    attention: "Accès long et isolé : jamais seul de nuit. Aucun abri.",
    zone: "E"
  },
  {
    id: 4, name: "Pointe et plage de l'Espiguette", commune: "Le Grau-du-Roi",
    lat: 43.4750, lon: 4.1480, type: "plage_barres", seaward: 165, river: false, lit: false,
    structure: "Sable, barres et cuvettes ; site Natura 2000 « Bancs sableux de l'Espiguette ». [S]",
    attention: "Pêche interdite depuis les plages du 15 juin au 15 septembre, de 9 h à 20 h. [S] Longue marche.",
    zone: "C"
  },
  {
    id: 5, name: "Digue de l'Espiguette (extérieur Port Camargue)", commune: "Le Grau-du-Roi",
    lat: 43.5165, lon: 4.1210, type: "digue", seaward: 240, river: false, lit: false,
    structure: "Enrochements sur sable à l'extérieur du port. [P]",
    attention: "Pêche interdite dans la plupart des ports : rester à l'extérieur. [S]",
    zone: "C"
  },
  {
    id: 6, name: "Jetées du chenal du Grau-du-Roi", commune: "Le Grau-du-Roi",
    lat: 43.5330, lon: 4.1320, type: "grau", seaward: 220, river: "vidourle", lit: true,
    structure: "Débouché commun du Vidourle et du chenal maritime : courant, éclairage. [S]",
    attention: "Pêche de loisir de nouveau autorisée dans le port depuis juillet 2025, sous conditions : lire le règlement du port. [S]",
    zone: "C"
  },
  {
    id: 7, name: "Digue et épis du Boucanet", commune: "Le Grau-du-Roi",
    lat: 43.5440, lon: 4.1220, type: "digue", seaward: 210, river: false, lit: false,
    structure: "Enrochements sur sable, pointes d'épis. [P]",
    attention: "Blocs glissants.",
    zone: "C"
  },
  {
    id: 8, name: "Passe du Ponant (Vidourle)", commune: "La Grande-Motte",
    lat: 43.5565, lon: 4.1060, type: "grau", seaward: 170, river: "vidourle", lit: false,
    structure: "Le Vidourle rejoint la mer en alimentant l'étang du Ponant : sortie d'étang. [S]",
    attention: "Courant fort par crue.",
    zone: "C"
  },
  {
    id: 9, name: "Digues extérieures et « digue cassée »", commune: "La Grande-Motte",
    lat: 43.5555, lon: 4.0880, type: "digue", seaward: 170, river: false, lit: true,
    structure: "Enrochements et brise-lames face au casino. [S]",
    attention: "Plages de La Grande-Motte : aucune restriction du 1er novembre au 30 avril. [S]",
    zone: "C"
  },
  {
    id: 10, name: "Plages du Grand et du Petit Travers", commune: "La Grande-Motte / Carnon",
    lat: 43.5530, lon: 4.0150, type: "plage_lisse", seaward: 165, river: false, lit: false,
    structure: "Grande plage peu profonde. [S] Suivi 2023 : petites barres disparues vers Carnon et Le Couchant, pente lisse (Département de l'Hérault).",
    attention: "Peu de fond : leurres légers ou peu plongeants.",
    zone: "C"
  },
  {
    id: 11, name: "Digues du port de Carnon", commune: "Mauguio-Carnon",
    lat: 43.5450, lon: 3.9760, type: "grau", seaward: 160, river: false, lit: true,
    structure: "Sortie de port reliée aux étangs (courant étang-mer). [S]",
    attention: "Rester à l'extérieur du port.",
    zone: "W"
  },
  {
    id: 12, name: "Embouchure du Lez et digues", commune: "Palavas-les-Flots",
    lat: 43.5280, lon: 3.9300, type: "grau", seaward: 155, river: "lez", lit: true,
    structure: "Embouchure du Lez, blocs posés sur le sable. [S] Plateau rocheux de Palavas-Carnon au large : un banc à 4-6 m, un second à 10-15 m (ZNIEFF). [S]",
    attention: "Plage des Épis : restriction horaire en saison seulement. [S]",
    zone: "W"
  },
  {
    id: 13, name: "Digue de l'étang du Prévost", commune: "Palavas-les-Flots",
    lat: 43.5195, lon: 3.9127, type: "grau", seaward: 155, river: false, lit: false,
    structure: "Digue au débouché de l'étang du Prévost. [S] Le Prévost est une lagune suivie pour les migrations de la daurade (Ifremer). [S]",
    attention: "Dangereuse quand la mer tape fort. [S]",
    zone: "W"
  },
  {
    id: 14, name: "Plage de Maguelone", commune: "Villeneuve-lès-Maguelone",
    lat: 43.5050, lon: 3.8780, type: "plage_barres", seaward: 150, river: false, lit: false,
    structure: "Plage sableuse ; formation de petites barres d'avant-côte observée en 2023. [S]",
    attention: "Accès par navette ou à pied en saison.",
    zone: "W"
  },
  {
    id: 15, name: "Les Aresquiers (fonds rocheux)", commune: "Vic-la-Gardiole / Frontignan",
    lat: 43.4660, lon: 3.8260, type: "roche", seaward: 140, river: false, lit: false,
    structure: "Plateau rocheux des Aresquiers, posidonies ; filières de moules au large où la daurade se concentre. [S] (FAO ArtFiMed)",
    attention: "Roches glissantes, posidonies protégées (Natura 2000 « Posidonies de la côte palavasienne »).",
    zone: "W"
  },
  {
    id: 16, name: "Digues et grau de Frontignan", commune: "Frontignan",
    lat: 43.4430, lon: 3.7720, type: "grau", seaward: 140, river: false, lit: true,
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

// Point de départ par défaut (coordonnées approximatives de Poulx)
window.HOME = { name: "Poulx", lat: 43.909, lon: 4.418 };
