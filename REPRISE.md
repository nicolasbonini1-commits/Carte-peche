# Reprise du projet Carte-peche

À lire au début d'une nouvelle conversation, avec `LECONS.md` du dépôt maison3d.
État au 18 novembre 2026, 14 h 15 (mis à jour par la conversation qui a fait la v2).

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

## Version 2 — branche `v2` (en attente de l'accord de Nico pour la mise en ligne)
- Pluie des 7 derniers jours : indice de pluie antérieure (pluie d'hier à 85 %, d'il y a 7 jours à 32 %), sur la côte et sur les bassins du Vidourle (43,90 / 3,92) et du Lez (43,70 / 3,86).
- Débits mesurés (Hub'Eau, données Vigicrues) : Rhône à Tarascon V720001002, Vidourle à Gallargues Y346400501, Lez à Lattes Y321002001 (débit en l/s → ÷ 1000). Comparés au débit habituel du mois (médiane des débits moyens mensuels depuis 1990) : moins de 2 fois = normal, 2 à 4 = l'eau se charge, 4 à 10 = crue, plus de 10 = forte crue [seuils P]. Beaucaire, Fourques et Arles ne donnent pas de débit horaire.
- Météo : `meteofrance_seamless` (AROME puis ARPEGE, environ 4,5 jours) puis `ecmwf_ifs025` ; secours = modèle par défaut si la requête échoue. Houle : « best match » = MFWAM de Météo-France sur cette côte (valeurs identiques, vérifié).
- Carte « Les 3 prochains jours » : coup de mer (houle ≥ 1,5 m), mer qui retombe, vent d'est ou marin ≥ 30 km/h, mistral ou tramontane ≥ 45 km/h ou rafales ≥ 75 km/h, vent qui forcit, ≥ 40 mm en 24 h sur un bassin, désaccord entre modèles. Liens Vigicrues et Météo Languedoc (prévisionnistes : pas de données réutilisables).
- Postes 6, 11, 12, 13 et 16 recalés sur les feux des ports et lieux-dits d'OpenStreetMap ; la fiche affiche d'où vient chaque position. Restent « à vérifier » : 1, 2, 4, 5, 7, 8, 9 (voir `pos` dans `js/spots.js`).
- Testée dans Chrome (format téléphone) avec les vraies réponses des services du 18 nov., 13 h 30, et en panne simulée (Météo-France ou Hub'Eau absents).
- Branche `essais-api` : uniquement les essais (workflow `diag-api`, relevés dans `diag/out/`) ; à supprimer après la mise en ligne. Son premier passage a échoué (Open-Meteo trop lent, mail du 18 nov. 13 h 34), les suivants ont réussi.

## Reste à faire
1. Mettre la v2 en ligne (fusion de `v2` dans `main`) après accord de Nico, puis supprimer `essais-api`.
2. Vérifier que Pages est activé et que l'appli s'installe sur l'écran d'accueil (Samsung Galaxy A55) ; tester en vrai les profondeurs EMODnet au toucher.
3. Recaler sur place les 7 postes « à vérifier » (bouton « Corriger la position »), puis reporter les positions dans `js/spots.js`.
4. Notifications des alertes : à décider avec Nico (proposition : une tâche GitHub toutes les 3 h calcule les alertes avec le même code que l'appli et écrit `alertes.json` ; Home Assistant le lit et envoie la notification sur le téléphone).
5. Témoignages vidéo : Claude ne peut pas regarder une vidéo ; Nico colle la transcription YouTube ou résume, à ranger comme preuve [V] (faible) dans la fiche du poste.
6. Utiliser le carnet pour caler les seuils (le carnet enregistre maintenant pluie 7 j, débit, niveau du fleuve et modèle météo) et réordonner les leurres par poste.
7. Plus tard : envoyer le carnet dans une base Notion.

## Limites connues
- Les coefficients ne sont pas encore calés sur des captures réelles : il faut une dizaine de sorties notées.
- La houle est prévue au large (environ 5 km) ; près du bord, elle est estimée.
- Au-delà de 3 jours, vent et houle sont peu fiables.
