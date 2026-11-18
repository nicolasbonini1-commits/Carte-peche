# Reprise du projet Carte-peche

À lire au début d'une nouvelle conversation, avec `LECONS.md` du dépôt maison3d.
État au 18 novembre 2026, 14 h 10 : v2 en ligne.

## Le projet
Appli web pour choisir son poste de pêche du bord (loup au leurre, dorade à la calée) entre les Saintes-Maries-de-la-Mer et Frontignan, selon la météo, la mer, l'heure, le temps disponible (1 h de route depuis Poulx) et l'envie du jour. Elle remplace le carnet papier.

- Dépôt : `nicolasbonini1-commits/Carte-peche` (public)
- Adresse : https://nicolasbonini1-commits.github.io/Carte-peche/ (GitHub Pages, branche `main`, dossier racine)
- Pourquoi GitHub Pages : une page claude.ai ne peut charger ni météo, ni carte, ni données externes.

## Ce qui est en place (branche `main`)
- 16 postes, d'est en ouest (`js/spots.js`). En v1 : positions estimées pour la plupart ; le relevé du 18 nov. (OpenStreetMap + profondeur EMODnet) a montré plusieurs points sur la terre, dans l'eau ou dans l'étang (voir v2).
- Modèle (`js/model.js`) : note = poste × saison × mer × lumière × vent × pluie × eau × carnet. Vent et houle sont calculés poste par poste selon son orientation ; la mer qui retombe est détectée (scénario H) ; scénarios A à J et leurres repris du guide Notion « Loup au leurre du bord ».
- Données : Open-Meteo (vent, rafales, nuages, pluie), Open-Meteo Marine (houle, température de l'eau), EMODnet (profondeurs, couche WMS + profondeur au toucher), OSRM (temps de route + 10 min), fonds OSM France / CARTO nuit / Esri satellite.
- Écrans : plan de sortie selon le temps dispo ; « Quand partir ? » (aube et soir sur 3 jours) ; « Je sais où je vais » (3 créneaux par jour et ordre des 3 leurres : surface → sous la surface → fond, avec coloris et animation) ; carnet sur le téléphone, avec copie et import ; thème jour (A, carte marine) et nuit (B, sombre) automatique.

## Version 2 — en ligne sur `main` depuis le 18 nov. 2026
- Pluie des 7 derniers jours : indice de pluie antérieure (pluie d'hier à 85 %, d'il y a 7 jours à 32 %), sur la côte et sur les bassins du Vidourle (43,90 / 3,92) et du Lez (43,70 / 3,86).
- Débits mesurés (Hub'Eau, données Vigicrues) : Rhône à Tarascon V720001002, Vidourle à Gallargues Y346400501, Lez à Lattes Y321002001 (l/s → ÷ 1000), comparés au débit habituel du mois (médiane des débits moyens mensuels depuis 1990). Seuils [P] : < 2 fois normal, 2-4 l'eau se charge, 4-10 crue, > 10 forte crue.
- Météo : `meteofrance_seamless` (AROME puis ARPEGE, ~4,5 jours) puis `ecmwf_ifs025`, comparés (« Prévision incertaine »). Houle = MFWAM Météo-France. Lecture commune appli / tâche d'alertes : `js/data.js`.
- Carte « Les 3 prochains jours » (coup de mer, mer qui retombe, vent d'est / marin, mistral ou tramontane, vent qui forcit, fortes pluies, désaccord des modèles).
- Postes 6, 11, 12, 13, 16 recalés (feux des ports OpenStreetMap) ; « à vérifier » : 1, 2, 4, 5, 7, 8, 9 ; le 3 est une zone de 15 km à remplacer ou supprimer. La fiche affiche d'où vient chaque position.
- Sans réseau (testé dans Chrome, pas encore sur l'A55) : l'appli s'ouvre, affiche « Pas de réseau » et les dernières prévisions avec leur heure, garde les derniers débits, le carnet et les morceaux de carte déjà regardés (3000 au plus). Pas de nouvelles prévisions, ni temps de route, ni profondeur au toucher.

## Notifications
- Tâche GitHub `alertes` (`.github/workflows/alertes.yml`, toutes les 3 h à h+23) : curl télécharge la météo, `notif/alertes.js` calcule avec le même code que l'appli et écrit `alertes.json` dans la branche `donnees` (champ `nouvelles` = alertes pas encore vues au passage précédent ; notifiées : niveau ≥ 2 et « mer qui retombe »). Premier passage réussi le 18 nov. à 14 h 02.
- Home Assistant : package `ha/packages/peche_alertes.yaml` et mission `ha/MISSION_PECHE_ALERTES.md` dans le dépôt maison3d, **pas encore installés** (dire à Claude Code « récupère le dépôt », puis lui donner la mission ; redémarrage de HA nécessaire). Notifie `notify.mobile_app_sm_a556b`, pas entre 22 h et 7 h ; capteur « Pêche alertes en panne » si le fichier a plus de 12 h.
- Limite : GitHub coupe les tâches planifiées d'un dépôt public après 60 jours sans activité ; le capteur de panne le signalera.

## Reste à faire
1. Installer les notifications dans HA (mission ci-dessus), vérifier le fichier de preuves.
2. Sur l'A55 : installer l'appli sur l'écran d'accueil, tester sans réseau (mode avion), tester la profondeur au toucher.
3. Recaler sur place les postes « à vérifier », puis reporter les positions dans `js/spots.js`.
4. Branches `essais-api` (essais du 18 nov.) et `v2` (déjà fusionnée) : à supprimer quand Nico est d'accord.
5. Témoignages vidéo : Nico colle la transcription YouTube ; à ranger comme preuve [V] (faible) dans la fiche du poste.
6. Caler les seuils avec le carnet (il enregistre pluie 7 j, débit, niveau du fleuve, modèle météo) ; réordonner les leurres par poste.
7. Idées v3 : mode rivière pour la truite (débit Hub'Eau déjà en place, température de l'eau, dates d'ouverture, postes en rivière) ; postes ajoutés n'importe où (Corse…) avec la météo calculée au poste plutôt que par 3 zones fixes.
8. Plus tard : envoyer le carnet dans une base Notion.

## Limites connues
- Les coefficients ne sont pas encore calés sur des captures réelles : il faut une dizaine de sorties notées.
- La houle est prévue au large (environ 5 km) ; près du bord, elle est estimée.
- Au-delà de 3 jours, vent et houle sont peu fiables.
