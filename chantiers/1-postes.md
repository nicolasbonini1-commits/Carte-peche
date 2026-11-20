# Chantier 1 — Postes : positions vérifiées, prévision au poste, postes dans les terres

Phrase de reprise : « reprise pêche chantier 1 : chantiers/1-postes.md ». Lire aussi `chantiers/REGLES-COMMUNES.md`, REPRISE.md, LECONS.md (maison3d) et LECONS.md (ce dépôt), skill coach-peche.
Branche : `chantier-1-postes`. Fichiers : `js/spots.js`, `js/data.js`, `js/app.js` (affichage des postes et de la météo), section types de postes (`M.HABITAT`) de `js/model.js`, `notif/alertes.js` si la prévision change.

## Pourquoi
Nico a 1 h de route : un poste mal placé fausse la houle, le vent et la couleur de l'eau calculés. 7 postes sont « à vérifier » (1, 2, 4, 5, 7, 8, 9 ; le 3 est une zone de 15 km). La météo et la mer sont calculées sur 3 zones pour 16 postes. Nico veut aussi des postes dans les terres, le long des canaux.

## Étapes proposées (une à la fois, accord de Nico entre chaque)
0. ~~En attente sur des branches prêtes~~ fait : webcams (`essai-webcams-20nov`) et actions v5 (`essai-actions-v5`) → demander l'accord, fusionner ensemble (cache v15).
1. Positions : pour chaque poste, point pris sur OSM (feu, jetée, épi, poste de secours) par une requête Overpass lancée par une tâche GitHub (**en-tête User-Agent obligatoire**, sinon 406 ; serveurs de secours), contrôle profondeur EMODnet, source écrite dans `pos`. Exemple fait : poste 12 = feu vert 43,52373 / 3,93525 (fichier `osm_lez.json`, branche `essais-sortie`). Montrer à Nico sur une carte avant de changer `js/spots.js`.
2. Prévision au poste : Open-Meteo accepte plusieurs points par requête ; chiffrer le gain (écart entre zones et postes sur quelques jours) avant de coder ; garder le fonctionnement sans réseau.
3. Postes dans les terres : Nico donne les canaux et endroits ; vérifier la réglementation (domaine maritime ou fluvial, carte de pêche, étangs, ports) sur source officielle ; nouveau type de poste (pas de houle ; courant, vent, couleur de l'eau) avec des règles **sourcées** (voir chantier 2).

## État
- 20 nov. 18 h 45 : fiche créée, rien commencé.
- 20 nov. 18 h 55 : étape 0 faite — webcams + actions v5 fusionnées sur `main` (cache v15), accord de Nico 18 h 52. Contrôle : syntaxe + liens webcams des 16 postes dans Node ; Chrome sans écran local impossible (Leaflet sur unpkg bloqué ici). Branches `essai-webcams-20nov` et `essai-actions-v5` à supprimer par Nico.
- 20 nov. 19 h 40 : étape 1 lancée, poste 1. Outil : `outils/postes/releve.js` + `carte.html`, tâche `postes.yml` (branche `chantier-1-postes`, résultats et cartes dans `essais-postes-donnees`). Requêtes Overpass découpées en 3 (une seule = 0 élément) ; délais d'attente ajoutés (une passe restée bloquée 10 min, annulée). Requête « repères » (feux, digues, noms) en échec sur les 3 serveurs (délai dépassé) : à alléger. Fichier `outils/postes/redessiner` = refaire la carte sans refaire le relevé (à retirer pour un nouveau poste).
  Poste 1 : l'ancien point (43,4515 / 4,3945) est sur la terre, rive ouest, ≈ 310 m au NO de l'embouchure. Candidat : fin du cours d'eau « Le Petit Rhône » (OSM way 231712579) sur le trait de côte (way 772046455) = **43,44995 / 4,39771**. Profondeur EMODnet : ≈ 0 m à l'embouchure (maille de 115 m), −3,7 m à 250 m au sud, −6,2 m à 500 m. Carte : `carte_poste_1_zoom.png`. 
- 20 nov. 19 h 55 : poste 1 recalé dans `js/spots.js` (branche seulement) avec l'accord de Nico : 43,44995 / 4,39771. Nico [N] : l'ancien point obligeait à traverser l'estuaire à la nage → « attention » : pêcher depuis la rive est. Pas encore sur `main` (fusion groupée à la fin de l'étape 1, avec un nouveau cache). Si Nico avait déplacé le poste 1 sur son téléphone, l'ancien point corrigé localement reste prioritaire. Prochain : poste 2 (fichier `redessiner` retiré).
- 20 nov. 20 h : requête « repères » allégée (noms à part) ; relevé du poste 2 lancé (résultats dans `essais-postes-donnees` : `poste_2.json`, `carte_poste_2.png`). À la reprise : lire ces fichiers, proposer un point sourcé, montrer la carte (candidats dans `candidats.json` + fichier `redessiner`).
