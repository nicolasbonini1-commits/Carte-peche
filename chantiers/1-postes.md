# Chantier 1 — Postes : positions vérifiées, prévision au poste, postes dans les terres

Phrase de reprise : « reprise pêche chantier 1 : chantiers/1-postes.md ». Lire aussi `chantiers/REGLES-COMMUNES.md`, REPRISE.md, LECONS.md (maison3d) et LECONS.md (ce dépôt), skill coach-peche.
Branche : `chantier-1-postes`. Fichiers : `js/spots.js`, `js/data.js`, `js/app.js` (affichage des postes et de la météo), section types de postes (`M.HABITAT`) de `js/model.js`, `notif/alertes.js` si la prévision change.

## Pourquoi
Nico a 1 h de route : un poste mal placé fausse la houle, le vent et la couleur de l'eau calculés. 7 postes sont « à vérifier » (1, 2, 4, 5, 7, 8, 9 ; le 3 est une zone de 15 km). La météo et la mer sont calculées sur 3 zones pour 16 postes. Nico veut aussi des postes dans les terres, le long des canaux.

## Étapes proposées (une à la fois, accord de Nico entre chaque)
0. En attente sur des branches prêtes : webcams (`essai-webcams-20nov`) et actions v5 (`essai-actions-v5`) → demander l'accord, fusionner ensemble (cache v15).
1. Positions : pour chaque poste, point pris sur OSM (feu, jetée, épi, poste de secours) par une requête Overpass lancée par une tâche GitHub (**en-tête User-Agent obligatoire**, sinon 406 ; serveurs de secours), contrôle profondeur EMODnet, source écrite dans `pos`. Exemple fait : poste 12 = feu vert 43,52373 / 3,93525 (fichier `osm_lez.json`, branche `essais-sortie`). Montrer à Nico sur une carte avant de changer `js/spots.js`.
2. Prévision au poste : Open-Meteo accepte plusieurs points par requête ; chiffrer le gain (écart entre zones et postes sur quelques jours) avant de coder ; garder le fonctionnement sans réseau.
3. Postes dans les terres : Nico donne les canaux et endroits ; vérifier la réglementation (domaine maritime ou fluvial, carte de pêche, étangs, ports) sur source officielle ; nouveau type de poste (pas de houle ; courant, vent, couleur de l'eau) avec des règles **sourcées** (voir chantier 2).

## État
- 20 nov. 18 h 45 : fiche créée, rien commencé.
