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
    id: 3, name: "Épis de l'Espiguette est", commune: "Le Grau-du-Roi", pos: "validé par Nico le 21 nov. 2026 (4 h) : bout du 2e des 11 épis OSM à l'est du phare de l'Espiguette ; profondeur EMODnet 4,1 m à 100 m",
    // Ancien poste : « Rivage sauvage Petit Rhône – Espiguette », zone de 15 km, point indicatif 43,4620 / 4,2500 (zone E).
    // Relevé de la bande côtière (zone_3.json, 21 nov.) : aucun parking public ni accès voiture connu dans OSM entre l'Espiguette
    // et le Petit Rhône ; le seul accès réaliste est à pied depuis l'Espiguette. Les 11 épis OSM (sur 1,2 km, à 2,2-3,5 km du phare)
    // sont la seule structure de cette côte, avec 4 m de fond à 100-150 m du bord (EMODnet) contre 1,5 m près du phare.
    // Source : OSM way 66036937 (groyne) ; série way 66036455 → 66037119 ; photo aérienne Esri (vue_p3b.png). seaward : côte OSM lissée (210°).
    lat: 43.47247, lon: 4.16500, type: "plage_barres", seaward: 210, river: false, lit: false,
    autour: [
      { name: "4e épi", lat: 43.47163, lon: 4.16771, src: "OSM way 66036957 [C]", note: "≈ 410 m par la plage" },
      { name: "7e épi", lat: 43.47033, lon: 4.17183, src: "OSM way 66037018 [C]", note: "≈ 780 m par la plage" },
      { name: "11e et dernier épi", lat: 43.46899, lon: 4.17741, src: "OSM way 66037119 [C]", note: "≈ 1,25 km par la plage" }
    ],
    structure: "Série de 11 épis sur une plage de sable sauvage, 4 m de fond à 100-150 m du bord (EMODnet) [C]. [S] « Le bar est présent près de la côte de septembre à février » (peche.com, rivage camarguais).",
    attention: "Accès à pied seulement : ≈ 1,9 km à vol d'oiseau depuis le parking des Baronnets (≈ 25 min par la plage, estimation). Jamais seul de nuit, aucun abri. Pêche depuis les plages du Grau-du-Roi interdite du 15 juin au 15 septembre de 9 h à 20 h (règle du poste 4, à confirmer ici).",
    zone: "C"
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
    id: 6, name: "Jetées du chenal du Grau-du-Roi", commune: "Le Grau-du-Roi", pos: "feu vert de la jetée rive gauche du chenal (OpenStreetMap, balisage) [S] ; contrôlé sur photo aérienne le 21 nov.",
    lat: 43.53468, lon: 4.13225, type: "grau", seaward: 220, river: "vidourle", lit: true,
    // validé par Nico le 21 nov. 2026 (4 h) : autour = épis de la plage rive gauche (même rive). La jetée rive droite, à 67 m, est de l'autre côté du chenal
    // (≈ 4,8 km à pied par les ponts) : écartée. 2e épi : bout côté large pris sur la photo (la côte OSM y est ancienne, la plage a avancé).
    autour: [
      { name: "1er épi de la plage rive gauche", lat: 43.53441, lon: 4.13393, src: "OSM way 66035073 [C]", note: "≈ 230 m par la plage" },
      { name: "2e épi de la plage rive gauche", lat: 43.53339, lon: 4.13495, src: "OSM way 66035060, bout côté large d'après la photo aérienne [C]", note: "≈ 630 m par la plage ; relié à la plage à son autre bout : accès à vérifier sur place" },
      { name: "3e épi de la plage rive gauche", lat: 43.53051, lon: 4.13777, src: "OSM way 66035063 [C]", note: "≈ 1 km par la plage" }
    ],
    structure: "Débouché commun du Vidourle et du chenal maritime : courant, éclairage. [S]",
    attention: "Règlement du port (art. 24, plan de mai 2026) : dans le périmètre du port (chenal, entre les môles), une seule canne à coup (9 m max., flotteur ≤ 6 g), pas de pêche au plomb sauf sur les épis côté mer (interdite de 9 h à 20 h du 15 juin au 15 septembre). Le leurre au moulinet et la tresse ne semblent pas prévus [S, texte complet non lu] ; leurre interdit dans le port, confirmé par Nico [N]. Loup vu dans le chenal à l'été 2026 [N] ; un témoignage rapporté par Nico parle d'une forte concentration de loups avant les crues [N, conditions météo à retrouver].",
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
    id: 8, name: "Passe du Ponant (grau des Abîmes)", commune: "La Grande-Motte", pos: "validé par Nico le 21 nov. 2026 (4 h) : bout de la jetée ouest du grau des Abîmes (OpenStreetMap + photo aérienne) ; profondeur EMODnet 3,1 m à 100 m",
    // Ancien point (43,5565 / 4,1060) : dans la pinède du Boucanet, 525 m au NE, à 6 m au-dessus de la mer (EMODnet).
    // Source : OSM way 231620423 (groyne, 230 m) = épi est de 230 m construit en 1984 près de la passe des Abîmes (Bonnefille 1989,
    // La Houille Blanche) [S] ; l'étang du Ponant communique avec la mer par le grau des Abîmes (Ifremer 2009) [S].
    // seaward : côte OSM lissée (185°).
    lat: 43.55286, lon: 4.09911, type: "grau", seaward: 185, river: "vidourle", lit: false,
    autour: [
      { name: "Brise-lames rattaché à la plage (Point Zéro)", lat: 43.55364, lon: 4.09503, src: "OSM way 375073050 ; relié à la plage par le sable sur la photo [C]", note: "≈ 700 m par la plage" },
      { name: "Rive est du grau (épi côté Boucanet)", lat: 43.55333, lon: 4.10137, src: "OSM way 66035894 [C]", note: "en face, ≈ 1,3 km à pied par le pont des Abîmes (à garder ou non : choix de Nico)" }
    ],
    structure: "Le Vidourle rejoint la mer en alimentant l'étang du Ponant ; l'étang communique avec la mer par le grau des Abîmes (Ifremer 2009) : sortie d'étang, courant. [S]",
    attention: "Courant fort par crue. Rester sur les enrochements côté mer.",
    zone: "C"
  },
  {
    id: 9, name: "Brise-lames à l'est du port et « digue cassée »", commune: "La Grande-Motte", pos: "validé par Nico le 21 nov. 2026 (4 h) : plage face au brise-lames « paysager » (OpenStreetMap + photo aérienne) ; ancien point à 30 m",
    // Ouvrages à l'est du port, contre l'érosion (Bonnefille 1989, La Houille Blanche) [S] : épi est de 230 m (1984), brise-lames
    // détachés (1987-88) dont un « paysager » de 120 m à 140 m du rivage = OSM way 9590832. La « digue cassée » « face au port et
    // au casino » (blog pechecustom34, sans date) [V] n'a pas pu être située avec certitude : brise-lames détachés ou tenon rocheux
    // au raccord port-plage (photo vue_p9c.png). seaward : côte OSM lissée (180°).
    lat: 43.55528, lon: 4.08816, type: "digue", seaward: 180, river: false, lit: true,
    autour: [
      { name: "Feu vert, bout de la jetée est du port", lat: 43.55327, lon: 4.08122, src: "OSM node 13391321713 ; jetée E Fl.G.4s (Figaro Nautisme) [S]", note: "≈ 750 m par la promenade de la digue est" },
      { name: "Plage face au 2e brise-lames", lat: 43.55551, lon: 4.09147, src: "OSM way 9590837 (détaché) [C]", note: "≈ 350 m par la plage" }
    ],
    structure: "Brise-lames détachés et épi construits de 1984 à 1988 à l'est du port contre l'érosion (Bonnefille 1989). [S] « Digue cassée » face au port et au casino : bon poste loup et daurade d'après un blog local. [V]",
    attention: "Plages de La Grande-Motte : aucune restriction du 1er novembre au 30 avril. [S] Brise-lames détachés : se pêchent depuis la plage, ne pas nager jusqu'à eux.",
    zone: "C"
  },
  {
    id: 10, name: "Plages du Grand et du Petit Travers", commune: "La Grande-Motte / Carnon", pos: "plage, point sur le trait de côte entre Petit et Grand Travers (OpenStreetMap, contrôlé sur photo le 21 nov.)",
    lat: 43.55337, lon: 4.01490, type: "plage_lisse", seaward: 165, river: false, lit: false,
    // validé par Nico le 21 nov. 2026 (4 h) : point recalé de 42 m sur le bord de l'eau ; autour = brise-lames côté Carnon et plage côté La Grande-Motte.
    autour: [
      { name: "Brise-lames vers Carnon", lat: 43.55176, lon: 4.00620, src: "OSM way 366086857 (breakwater) [C]", note: "≈ 750 m par la plage, premier d'une série" },
      { name: "Plage vers La Grande-Motte", lat: 43.55464, lon: 4.02339, src: "trait de côte OSM [C]", note: "≈ 700 m par la plage" }
    ],
    structure: "Grande plage peu profonde. [S] Suivi 2023 : petites barres disparues vers Carnon et Le Couchant, pente lisse (Département de l'Hérault).",
    attention: "Peu de fond : leurres légers ou peu plongeants.",
    zone: "C"
  },
  {
    id: 11, name: "Digues du port de Carnon", commune: "Mauguio-Carnon", pos: "feu rouge « Carnon » en tête de digue (OpenStreetMap, balisage) [S] ; contrôlé sur photo aérienne le 21 nov.",
    lat: 43.53989, lon: 3.97724, type: "grau", seaward: 160, river: false, lit: true,
    // validé par Nico le 21 nov. 2026 (4 h) : autour = épis de la plage ouest (même côté que la digue). Les brise-lames à l'est sont de l'autre côté
    // de l'entrée du port (pont à ≈ 800 m dans les terres) : écartés.
    autour: [
      { name: "Épi 34 (vers Palavas)", lat: 43.53962, lon: 3.96842, src: "OSM way 698165180 (« épi 34 », BD Ortho 2019) [C]", note: "≈ 870 m par la digue et la plage" },
      { name: "Épi suivant (vers Palavas)", lat: 43.53934, lon: 3.96732, src: "OSM way 698165181 (BD Ortho 2019) [C]", note: "≈ 960 m" }
    ],
    structure: "Sortie de port reliée aux étangs (courant étang-mer). [S]",
    attention: "Rester à l'extérieur du port.",
    zone: "W"
  },
  {
    id: 12, name: "Embouchure du Lez et plage des Épis", commune: "Palavas-les-Flots", pos: "validé par Nico le 21 nov. 2026 (4 h 41) : feu vert « Palavas les Flots », tête de jetée rive gauche à la sortie du Lez (OpenStreetMap + photo aérienne)",
    // Ancien point (43,5237 / 3,9353, feu vert « tête de la jetée ouest », retenu le 20 nov.) : la photo aérienne du 21 nov. (vue_p12.png)
    // le montre DANS le port de plaisance, au bout d'un môle intérieur. Le Lez sort 250 m plus au nord, entre la jetée rive gauche
    // (ce point) et le môle du port (feu « Le Lez », rive droite, en face, ≈ 1,5 km à pied par le pont de l'Union : écarté).
    // Source : OSM node 1420666382 (feu vert « Palavas les Flots »), jetée way 372219033. seaward : inchangé (côte rive gauche ≈ 145-155°).
    lat: 43.52598, lon: 3.93449, type: "grau", seaward: 155, river: "lez", lit: true,
    autour: [
      { name: "1er épi de la plage des Épis", lat: 43.52757, lon: 3.93600, src: "OSM way 372219038 [C]", note: "≈ 330 m par la plage ; potentiel loup non évalué" },
      { name: "2e épi de la plage des Épis", lat: 43.52847, lon: 3.93777, src: "OSM way 372219028 [C]", note: "≈ 560 m ; potentiel loup non évalué" },
      { name: "3e épi de la plage des Épis", lat: 43.52851, lon: 3.93975, src: "OSM way 372219024 [C]", note: "≈ 760 m ; potentiel loup non évalué" }
    ],
    structure: "Embouchure du Lez, blocs posés sur le sable. [S] Plateau rocheux de Palavas-Carnon au large : un banc à 4-6 m, un second à 10-15 m (ZNIEFF). [S]",
    attention: "Plage des Épis : restriction horaire en saison seulement. [S] Rester hors du port de plaisance.",
    zone: "W"
  },
  {
    id: 13, name: "Grau du Prévost", commune: "Palavas-les-Flots", pos: "validé par Nico le 21 nov. 2026 (4 h) : bout de la jetée ouest du grau du Prévost (OpenStreetMap + photo aérienne) ; profondeur EMODnet 5,2 m à 200 m",
    // Ancien point (43,5185 / 3,9101) : poste de secours du Grau du Prévost, sur la plage, 425 m à l'ouest du grau.
    // Source : jetée OSM way 389802447 ; grau = canal OSM way 9219451, de l'étang à la mer ; photo vue_p13b.png.
    lat: 43.51802, lon: 3.91524, type: "grau", seaward: 155, river: false, lit: false,
    autour: [
      { name: "Bout de la jetée est du grau", lat: 43.51846, lon: 3.91525, src: "OSM way 389802444 [C]", note: "en face : ≈ 0,5-0,7 km par le pont de l'avenue de l'Évêché-de-Maguelone" },
      { name: "Brise-lames est (vers Palavas)", lat: 43.51977, lon: 3.91607, src: "OSM way 389802463 [C]", note: "≈ 0,5-0,7 km par le même pont" },
      { name: "Plage vers Maguelone", lat: 43.51541, lon: 3.90396, src: "trait de côte OSM [C]", note: "≈ 1 km par la plage (passe le poste de secours)" }
    ],
    structure: "Grau entre deux jetées au débouché de l'étang du Prévost. [S] Le Prévost est une lagune suivie pour les migrations de la daurade (Ifremer). [S]",
    attention: "Dangereuse quand la mer tape fort. [S]",
    zone: "W"
  },
  {
    id: 14, name: "Plage de Maguelone (Pilou)", commune: "Villeneuve-lès-Maguelone", pos: "validé par Nico le 21 nov. 2026 (4 h) : bord de l'eau devant le poste de secours du Pilou (OpenStreetMap + photo aérienne)",
    // Ancien point (43,5050 / 3,8780) : DANS l'étang, derrière le lido (photo vue_p14.png), à 470 m du bord de mer.
    // Source : poste de secours Pilou (OSM node 9017360787), trait de côte OSM. seaward : inchangé (côte OSM 145°).
    lat: 43.50514, lon: 3.88363, type: "plage_barres", seaward: 150, river: false, lit: false,
    autour: [
      { name: "Plage vers Frontignan", lat: 43.50075, lon: 3.87578, src: "trait de côte OSM [C]", note: "≈ 800 m par la plage" },
      { name: "Plage vers Palavas", lat: 43.50941, lon: 3.89162, src: "trait de côte OSM [C]", note: "≈ 800 m par la plage" }
    ],
    structure: "Plage sableuse ; formation de petites barres d'avant-côte observée en 2023. [S]",
    attention: "Accès par la passerelle du Pilou depuis Villeneuve (horaires d'ouverture à vérifier, Hérault Tourisme) [S] ou par la route de Maguelone depuis Palavas ; parking du Pilou payant à ≈ 1,5 km.",
    zone: "W"
  },
  {
    id: 15, name: "Les Aresquiers (fonds rocheux)", commune: "Vic-la-Gardiole / Frontignan", pos: "plage des Aresquiers, point sur le trait de côte (OpenStreetMap, contrôlé sur photo le 21 nov.)",
    lat: 43.46623, lon: 3.82565, type: "roche", seaward: 125, river: false, lit: false,
    // validé par Nico le 21 nov. 2026 (4 h) : point recalé de 39 m sur le bord de l'eau ; seaward 140 → 125 (côte OSM lissée : le lido est orienté ≈ 35°).
    // Photo vue_p15.png : bandes sombres au large (fonds rocheux, posidonies) à partir de ≈ 150 m du bord.
    autour: [
      { name: "1er épi vers Frontignan", lat: 43.46053, lon: 3.81985, src: "OSM way 965374972 [C]", note: "≈ 790 m par la plage, début d'une série d'épis" },
      { name: "Plage vers Maguelone", lat: 43.47123, lon: 3.83082, src: "trait de côte OSM [C]", note: "≈ 700 m ; petit parking avant le pont du canal (Hérault Tourisme) [S]" }
    ],
    structure: "Plateau rocheux des Aresquiers, posidonies ; filières de moules au large où la daurade se concentre. [S] (FAO ArtFiMed)",
    attention: "Roches glissantes, posidonies protégées (Natura 2000 « Posidonies de la côte palavasienne »).",
    zone: "W"
  },
  {
    id: 16, name: "Digues et grau de Frontignan", commune: "Frontignan", pos: "feu rouge en tête de la digue ouest du port de Frontignan (OpenStreetMap, balisage ; Digue W Fl.R.4s, Figaro Nautisme) [S] ; contrôlé sur photo le 21 nov.",
    lat: 43.43031, lon: 3.77745, type: "grau", seaward: 140, river: false, lit: true,
    // validé par Nico le 21 nov. 2026 (4 h) : autour = épis de la plage ouest (même côté). La digue est (feu vert) et la plage est sont de l'autre côté du chenal : écartées.
    autour: [
      { name: "1er épi à l'ouest", lat: 43.43116, lon: 3.77536, src: "OSM way 567474874 (BD Ortho IGN) [C]", note: "≈ 280 m par la plage" },
      { name: "2e épi à l'ouest", lat: 43.43097, lon: 3.77474, src: "OSM way 391636700 [C]", note: "≈ 350 m" }
    ],
    structure: "Port de part et d'autre d'un chenal qui relie l'étang d'Ingril à la mer (FAO ArtFiMed) [S]. Filières de moules au large entre Frontignan et Agde. [S]",
    attention: "Rester à l'extérieur du port.",
    zone: "W"
  },
  // ---------- Point à explorer (ajouté le 23 nov. 2026, accord de Nico pour main ; essai : branche essai-poste17-appli) ----------
  // explore: true = trouvé sur une vidéo, jamais pêché par Nico, hors du secteur de l'appli (Saintes-Maries → Frontignan).
  //   Effets dans js/app.js : marqueur violet « ? », bandeau dans la fiche, classé avec les autres tant que
  //   EXPLORE_DANS_CLASSEMENT = true (plus bas), jamais dans les alertes (notif/alertes.js ne lit pas les postes).
  // Détail, sources et validation : chantiers/4-poste17.md (branche essai-poste17).
  {
    id: 17, explore: true, name: "Pointe de Beauduc – grau de l'étang (vidéo)", commune: "Arles (Salin-de-Giraud)",
    pos: "rive ouest du grau de l'étang de Beauduc : repéré dans une vidéo Fada2pêche du 14 févr. 2025 [V], lu sur la photo aérienne Esri du 25 mars 2025 [C], validé par Nico sur Géoportail le 22 nov. 2026",
    // P : pointe de sable à l'embouchure du grau, ligne de blocs de l'ancienne digue frontale (1972, Suanez & Bruzzi 1999 [S]) à ≈ 230 m au large [C].
    // Sources : photo Esri World Imagery du 25 mars 2025, vue 600 m ≈ 0,9 m/pixel (branche essais-poste17, passage-22-17h19 et controle-22-17h30) ;
    // validation de Nico sur Géoportail le 22 nov. 2026, 22 h 54-23 h 08. Profondeur EMODnet (maille ≈ 115 m) : −0,9 m au pied, −2,5 m à 300 m, −3,7 m à 500 m [M].
    // seaward 186 : trait de côte a → P orienté ≈ 96°, mer au sud [C] (le profil EMODnet de l'étape 3 utilisait 215°).
    // type "plage_barres" (choix du 23 nov., confirmé par Nico le 23 nov.) — effets des types dans js/model.js :
    //   - grau : Poste loup 0,90 / dorade 0,95, houle au poste × 0,8 (abri des jetées), bonus dorade d'oct.-nov. (sorties d'étang),
    //     leurre lourd (L2 18 g) et « dérive dans la veine de courant » ;
    //   - digue : 0,80 / 0,70, houle longue comptée une classe au-dessus, « Prudence » sur les enrochements dès 1,5 m ;
    //   - plage_barres : 0,65 / 0,40, pas d'abri, mer formée idéale, leurres pour petit fond (6 g).
    //   Ce qui est mesuré à P : sable, petit fond (−0,9 m au pied, −2,5 m à 300 m) [M], aucune jetée (pas d'abri) [C], on pêche depuis le sable,
    //   pas sur les blocs. Le grau sort d'un étang des salins : ouverture et courant inconnus [P]. → plage_barres = le seul type qui ne suppose
    //   rien de non vérifié ; la ligne de blocs et le grau ne sont pas comptés, donc la note est probablement sous-estimée [P].
    lat: 43.36147, lon: 4.59261, type: "plage_barres", seaward: 186, river: "rhone", lit: false,
    // Pour le temps de trajet (js/app.js) : route jusqu'au parking, puis marche_min minutes (fin de piste ≈ 15 min [P] + 9,1 km à pied ≈ 2 h [P]).
    parking: { lat: 43.40731, lon: 4.59691, src: "OSM way 240666081 (amenity=parking, access=yes, fee=no, sable), au bout de la piste de Beauduc ; validé par Nico le 22 nov. 2026" },
    marche_min: 135,
    autour: [
      { name: "Racine de l'ancienne digue, sous le phare", lat: 43.36206, lon: 4.58453,
        src: "photo Esri du 25 mars 2025 [C] ; phare de Beauduc OSM way 677380045 ; validé par Nico sur Géoportail le 22 nov. 2026 (digue entièrement immergée)",
        note: "≈ 656 m par la plage ; ancienne digue immergée" },
      { name: "Plage face à la ligne de blocs", lat: 43.36179, lon: 4.58875,
        src: "photo Esri du 25 mars 2025 [C] ; ligne de blocs ≈ 43,3601 / 4,5885 → 43,3572 / 4,6015 validée par Nico le 22 nov. 2026 (Géoportail : immergée)",
        note: "≈ 314 m par la plage ; blocs immergés à ≈ 200 m du bord" }
    ],
    structure: "Pointe de sable à la sortie du grau de l'étang de Beauduc [C] ; ligne de blocs de l'ancienne digue frontale (construite en 1972, ≈ 200 m du rivage, Suanez & Bruzzi 1999) [S], à ≈ 230 m au large, immergée sur Géoportail [C]. Loup de 3,61 kg au leurre de surface dans la vidéo Fada2pêche du 14 févr. 2025 [V]. Les blocs peuvent être visibles ou couverts selon le niveau de la mer (vent, pression) [P].",
    attention: "Aucun secours proche, jamais seul de nuit. Rive est du grau (jonction blocs / rivage) écartée : il faudrait traverser le grau (≈ 70 m, profondeur et courant inconnus).",
    acces: "Parking OSM 240666081 au bout de la piste de Beauduc (≈ 10 km de piste depuis Salin-de-Giraud, gabarit ≈ 2,1 m) [C], puis 9,1 km à pied (≈ 2 h, plus sur sable mou) par la plage du golfe, le sentier sableux interdit aux véhicules et la plage sud [C]. Pas de raccourci : la digue des Pétroliers est privée et coupée par une brèche d'≈ 50 m d'eau (vue par Nico sur Géoportail) [C]. Route Poulx → parking ≈ 1 h 38 (OSRM, arrêt à 3,9 km du parking) [M] : ≈ 3 h 50 de trajet aller en tout [P].",
    reglement: "Zone de protection de biotope de la pointe de Beauduc (arrêté du 15/07/2015, JO du 09/12/2015 ; partie terrestre : arrêté préfectoral n° 2013273-0017 du 30/09/2013) [S] : véhicules à moteur interdits sur la pointe, chiens tenus du 1er avril au 30 septembre, ni camping ni bivouac ; la pêche du bord à la ligne n'est pas visée [S]. Cantonnement de pêche du golfe de Beauduc (toute pêche interdite, fiche réglementation du Parc naturel régional de Camargue) [S] : à plus de 7 km, hors zone.",
    zone: "E"
  }
];
// Point à explorer dans le classement ? true = classé comme les autres (décision de Nico le 23 nov. 2026), marqueur violet gardé.
// false = hors du classement : il reste sur la carte et en bas de la liste, avec sa note.
window.EXPLORE_DANS_CLASSEMENT = true;

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
