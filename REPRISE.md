# Reprise du projet Carte-peche

À lire au début d'une nouvelle conversation, avec `LECONS.md` de ce dépôt (leçons pêche), `LECONS.md` du dépôt maison3d, le skill coach-peche et `git log -5`.
**Résumé.** Tout le détail (calculs, essais, chiffres, commits) est dans `HISTORIQUE.md`, copie intégrale de l'ancien REPRISE.md au 20 nov. 16 h 30 : y chercher par le titre de section indiqué « (H : … ») avant de refaire un travail ou de répondre sur un point précis.
État au 20 nov. 2026, 21 h 30 : `main` = cache `carte-peche-v16` (règle « eau froide » du chantier 2, accord de Nico 21 h 27) ; v15 = webcams + actions v5 (chantier 1, 18 h 52).

## Le projet
- Appli web (PWA) pour choisir son poste du bord, loup au leurre et dorade à la calée, des Saintes-Maries à Frontignan ; 1 h de route depuis Poulx ; remplace le carnet papier. Usage perso uniquement (API non commerciales OK, Play Store mis de côté).
- Dépôt public `nicolasbonini1-commits/Carte-peche`, adresse https://nicolasbonini1-commits.github.io/Carte-peche/ (Pages, `main`, racine). Installée sur l'A55 (icône « Où pêcher »).
- Fichiers : `js/spots.js` (16 postes), `js/model.js` (note = poste × saison × mer × lumière × vent × couleur de l'eau × carnet ; scénarios A à J ; `M.SEASON`, `M.TURB`, `M.PECHABLE`, `M.buoyFor`, `M.seaNote`), `js/data.js` (lecture commune appli / alertes, `PAST_DAYS = 14`), `js/app.js`, `sw.js` (nom du cache), `notif/alertes.js`, `notif/houle.js`, `notif/releves.js`, tâches `.github/workflows/alertes.yml` et `releves.yml`.
- Données : Open-Meteo (`meteofrance_seamless` puis `ecmwf_ifs025`, comparés), Open-Meteo Marine (MFWAM), Hub'Eau (Rhône Tarascon V720001002, Vidourle Gallargues Y346400501, Lez Lattes Y321002001, ÷ médiane du mois depuis 1990), bouées Candhis Espiguette 03001 et Sète 03404 (clé seule dans `Authorization`, secret `CANDHIS_TOKEN`, 150 requêtes/jour, Licence Ouverte : citer CANDHIS et le Cerema), EMODnet (profondeur, bateaux de pêche 2024), OSRM, fond OSM France (filtre la nuit ; CARTO exige une clé depuis août 2026). (H : « Version 2 », « Houle mesurée », « Ajouts du 18 nov. »)

## En service
- **Note** : houle mesurée par la bouée la plus proche (postes 1-11 Espiguette, 12-16 Sète), note mer sur 5, houle longue ≥ 8 s ; couleur de l'eau estimée en FNU (fleuves, houle, pluie de la côte sur 14 jours ; R² test 0,654) ; seuils Rhône 1,5 / 2,5 / 4 fois. Toute la grille est [P] tant que le carnet n'a pas une dizaine de sorties. (H : « Reste à faire » 0, « Couleur de l'eau », « Décisions … 12 h 33 »)
- **« Pêchable ? »** (postes 6 et 8 seulement) : Vidourle ÷ normale ≥ 5× → non ; 4-5× ou dans les 2 jours après le dernier jour ≥ 4× → douteux ; sinon oui. **Ne baisse pas la note** (décision de Nico : d'abord confronter à ses relevés et prises). (H : « Chenaux », « Relevé “Je suis sur place” »)
- **Relevé « Je suis sur place »** + carnet (touches, filets, chalutiers, couleur de l'eau) → « Envoyer mes relevés » ouvre un ticket GitHub pré-rempli (≈ 2 relevés par ticket, 4000 caractères max) → tâche `releves` → `releves.json` dans la branche `releves` (« pas assez pour conclure » sous 5). **Aucun ticket reçu à ce jour.**
- **Alertes** : Home Assistant lance `alertes.yml` toutes les 3 h à h+05 (clé « HA alertes pêche », dépôt Carte-peche seul, expire le 19 nov. 2027, rappel HA) ; résultats `alertes.json` et `houle.json` dans `donnees` (réécrite entièrement à chaque passage) ; package `ha/packages/peche_alertes.yaml` v2 dans maison3d ; pas de notification entre 22 h et 7 h, ni du 31 déc. au 28/29 févr. ; capteur « en panne » au-delà de 12 h. Planning GitHub gardé en secours (souvent sauté). (H : « Notifications », « Reste à faire » 1 bis)
- Sans réseau : l'appli s'ouvre avec les dernières données, bandeau « Pas de réseau », se remet à jour seule au retour du réseau.

## En attente d'une décision de Nico
1. **Couleur de l'eau en douceur** : interpoler le facteur sur log(FNU) entre les centres de classe (2 ; 6,3 ; 17,3 ; 60 FNU) au lieu des sauts (ex. poste 2 : 30 FNU → loup 82 % au lieu de 60 %). Rien codé ; recommandé : essai sur branche puis comparaison des notes. (H : « Fin d'après-midi du 20 nov. »)

## Points ouverts
- **Candhis injoignable depuis le 20 nov. vers 15 h** (dernière mesure 11 h 30 UTC). À revoir après le passage de 18 h 05.
- **Fuseau des heures Candhis non tranché** (UTC plus plausible) → Nico écrit à candhis@cerema.fr. Branche `essai-fuseau-candhis` à supprimer ensuite.
- Plafond du Rhône à 2× : écarté (gain trop petit), à revoir si sorties aux postes 1-2 pendant une crue.
- Embouchures : l'indice ne calcule pas l'étendue du panache, ne voit pas l'intérieur des chenaux ni les étangs ; Lez à Palavas, Carnon, Frontignan, La Grande-Motte illisibles au satellite → webcams + carnet.
- Jamais vu en vrai : une notification partie seule, la pause de nuit, l'alerte « en panne », le relevé et « Pêchable ? » sur l'A55, la profondeur au toucher, la carte de nuit sur l'A55. Journal HA pas regardé.

## 3 chantiers en parallèle (20 nov., 18 h 45) — une conversation chacun
Fiches : `chantiers/1-postes.md`, `chantiers/2-regles-sourcees.md`, `chantiers/3-donnees-terrain.md` ; règles communes (preuves, travail en parallèle) : `chantiers/REGLES-COMMUNES.md`. Le détail ci-dessous est repris dans ces fiches.

## Prochain chantier (choisi par Nico le 20 nov., 18 h 23)
1. **Localisation poste par poste** : recaler les postes « à vérifier » (1, 2, 4, 5, 7, 8, 9 ; le 3 = zone de 15 km), positions prises dans OSM (feux, jetées, épis) + EMODnet. Méthode qui marche : requête Overpass lancée par une tâche GitHub, **avec un en-tête User-Agent** (sans lui : 406), serveurs de secours. Poste 12 contrôlé le 20 nov. : feu vert OSM 43,52373 / 3,93525 = tête de la jetée ouest de l'entrée commune Lez + port de Palavas ; le Lez finit 250 m plus au nord entre les feux « Le Lez » (rouge) et « Palavas les Flots » (vert) (`osm_lez.json`, branche `essais-sortie`).
2. **Prévision plus fine par poste** (aujourd'hui : 3 zones de météo et de mer pour 16 postes).
3. **Postes dans les terres, le long des canaux** (Nico donne les lieux) : nouveau type de poste (pas de houle ; courant, vent, couleur de l'eau ; règles de pêche des canaux et étangs à vérifier).
- **Eau froide (fait, chantier 2, `main` v16 le 20 nov. 21 h 30, publié par Pages 21 h 30)** : sous 14 °C [P], fond en premier et surface en court essai [P] à vérifier, animations plus lentes [S] (Claireaux & Lagardère 1999) ; même phrase ajoutée à la ligne « Leurre : » (`M.coldNote`). Essai Chrome (tâche `essai-eau-froide`, branche `essais-eau-froide`, 21 h 29) : 0 erreur, eau réelle 16,4-17,2 °C donc ordre habituel, seuil forcé → fond en premier sur 5 fiches, hors ligne et retour OK. Reste du chantier 2 : `chantiers/2-regles-sourcees.md`. Oubli du plan du 21 nov. : lune presque pleine (87 %), le guide Notion dit l'aube moins productive [S].
- **Dorade, bonus d'automne des graus (fait, chantier 2, `main` v17 le 20 nov., publié par Pages 22 h 08)** : `GRAU_AUTUMN` limité à oct.-nov. (Prévost : aucun départ en sept. ni déc., Mignucci 2023 ; Thambithurai 2026 : oct.-nov.) ; « pour la dorade » corrigé (fiche et note mer). Essai Chrome 22 h 07 (`essai-dorade-saison` → `essais-dorade-saison`) : 0 erreur, classement de novembre identique, hors ligne et retour OK. Bonus d'octobre sans effet (plafond à 1) : à revoir.

## À faire par Nico
- Écrire à Candhis (fuseau) ; envoyer un premier vrai relevé depuis l'A55.
- RecFishing (obligatoire avant la prochaine sortie) : bloqué le 20 nov. à la connexion EU Login (« Aucun appareil mobile n'a été trouvé ») → installer l'appli EU Login sur l'A55, puis sur un ordinateur : ecas.ec.europa.eu › roue dentée › Mon compte › Gérer mes appareils mobiles › Ajouter, et scanner le QR code avec l'A55 (procédure peche.com, article 51245).
- Branches : supprimées par Nico le 20 nov. (17 h 25) sauf `essai-pluie-houle`, que GitHub refuse de supprimer (ni protégée, ni liée à une demande de fusion ouverte : cause inconnue). **À garder** : `main`, `donnees`, `releves`, `essais-api`, `essai-chenaux`, `essais-chenaux-donnees`, `essai-turbidite`, `essais-turbidite-releves`, `essais-turbidite-satellite` (RESULTATS.md cités dans `js/model.js`) ; en attente : `essai-fuseau-candhis` ; fusionnées, à supprimer : `essai-actions-v5`, `essai-webcams-20nov` ; à supprimer : `essai-eau-froide` + `essais-eau-froide` (essai du chantier 2, `outils/essai_eau_froide.js`), `essai-sortie-21nov` + `essais-sortie` (plan de sortie du 21 nov. calculé par la vraie appli dans Chrome sans écran, 20 nov. 17 h 52 ; `outils/essai_sortie.js` réutilisable pour une prochaine sortie). Anciens commits des branches supprimées : H, « Reste à faire » 6.

## Plus tard
Revérifier la webcam de La Grande-Motte (grandemotte.roundshot.com/port-ouest/) · Recaler sur place les postes « à vérifier » (1, 2, 4, 5, 7, 8, 9 ; le 3 est une zone de 15 km) · postes moins classiques (Ponant, canaux : Nico donne les lieux ; coordonnées sourcées + OSM + EMODnet) · caler seuils, saison et ordre des leurres avec une dizaine de sorties · témoignages vidéo en preuve [V] · chalutiers en direct (aisstream) · carnet vers Notion · agent du matin · idées v3 (truite, postes n'importe où). (H : « Reste à faire » 5 à 12, « Données en attente »)

## Règles de travail
- Toute modif de l'appli : branche d'essai → test Chrome sans écran par une tâche GitHub avec les vraies réponses (aussi sans réseau et au retour du réseau) → nouveau nom de cache dans `sw.js` → accord de Nico → `main` (fichiers de l'appli seulement, pas les fichiers d'essai) → contrôle du site en ligne → mise à jour de ce fichier avec les heures réelles (`gh run list`).
- Un essai hors `main` n'écrit jamais dans `donnees`. `git fetch` juste avant de pousser.
- Ici : le résumé de l'état actuel. Quand un sujet est clos, son détail va en bas de `HISTORIQUE.md`, daté.

## Repères
Loup en Méditerranée : 30 cm, sans quota ni fermeture (vérifié le 19 nov., peche.com + Légifrance). Chalut interdit à moins de 3 milles ou en deçà de 50 m de fond. GitHub coupe les tâches planifiées d'un dépôt public après 60 jours sans activité. Limites : coefficients pas encore calés sur des captures ; houle prévue au large (~5 km), estimée au bord ; vent et houle peu fiables au-delà de 3 jours.
