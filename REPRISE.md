# Reprise du projet Carte-peche

À lire au début d'une nouvelle conversation, avec `LECONS.md` du dépôt maison3d.
État au 18 novembre 2026, 13 h 45.

## Le projet
Appli web pour choisir son poste de pêche du bord (loup au leurre, dorade à la calée) entre les Saintes-Maries-de-la-Mer et Frontignan, selon la météo, la mer, l'heure, le temps disponible (1 h de route depuis Poulx) et l'envie du jour. Elle remplace le carnet papier.

- Dépôt : `nicolasbonini1-commits/Carte-peche` (public)
- Adresse : https://nicolasbonini1-commits.github.io/Carte-peche/ (GitHub Pages, branche `main`, dossier racine)
- Pourquoi GitHub Pages : une page claude.ai ne peut charger ni météo, ni carte, ni données externes.

## Ce qui est en place (branche `main`)
- 16 postes, d'est en ouest (`js/spots.js`). 6 positions vérifiées sur des sources publiées (grau d'Orgon, phare de l'Espiguette, Aresquiers…), les 10 autres sont estimées.
- Modèle (`js/model.js`) : note = poste × saison × mer × lumière × vent × pluie × eau × carnet. Vent et houle sont calculés poste par poste selon son orientation ; la mer qui retombe est détectée (scénario H) ; scénarios A à J et leurres repris du guide Notion « Loup au leurre du bord ».
- Données : Open-Meteo (vent, rafales, nuages, pluie), Open-Meteo Marine (houle, température de l'eau), EMODnet (profondeurs, couche WMS + profondeur au toucher), OSRM (temps de route + 10 min), fonds OSM France / CARTO nuit / Esri satellite.
- Écrans : plan de sortie selon le temps dispo ; « Quand partir ? » (aube et soir sur 3 jours) ; « Je sais où je vais » (3 créneaux par jour et ordre des 3 leurres : surface → sous la surface → fond, avec coloris et animation) ; carnet sur le téléphone, avec copie et import ; thème jour (A, carte marine) et nuit (B, sombre) automatique.

## Travail en cours sur la branche `essais-api`
Une autre conversation Claude y travaille (18 nov., vers 13 h 30) :
- pluie sur les 7 derniers jours et indice de pluie antérieure ;
- débits des fleuves en direct (Hub'Eau, données Vigicrues) comparés aux débits mensuels de référence ;
- un workflow GitHub Actions `diag-api` qui interroge les API pour vérifier leurs vraies réponses (au moins un passage a échoué, mail du 18 nov. 13 h 34).

Avant toute modification : regarder où en est cette branche (`git log origin/essais-api`) et ne pas travailler sur `main` en parallèle.

## Reste à faire
1. Vérifier que Pages est activé et que l'appli s'installe sur l'écran d'accueil (Samsung Galaxy A55).
2. Tester en vrai : météo, profondeurs EMODnet (le service de profondeur au toucher accepte-t-il le navigateur ?), temps de route.
3. Finir et fusionner `essais-api` (pluie 7 jours, débits), puis supprimer le workflow de test.
4. Vérifier les 10 positions de postes estimées dans des sources publiées.
5. Utiliser le carnet pour réordonner les leurres par poste.
6. Plus tard : envoyer le carnet dans une base Notion.

## Limites connues
- Les coefficients ne sont pas encore calés sur des captures réelles : il faut une dizaine de sorties notées.
- La houle est prévue au large (environ 5 km) ; près du bord, elle est estimée.
- Au-delà de 3 jours, vent et houle sont peu fiables.
