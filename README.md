# Carte de pêche – loup & dorade

Application web (téléphone) pour choisir son poste de pêche du bord entre **Saintes-Maries-de-la-Mer et Frontignan**, selon la météo et la mer réelles, l'heure, le temps disponible et l'espèce visée.

Adresse : https://nicolasbonini1-commits.github.io/Carte-peche/

## Ce que fait l'appli

1. Récupère en direct la météo (vent, rafales, nuages, pluie) et la mer (houle, direction, période, température de l'eau) pour 3 zones de la côte, plus la pluie sur les bassins versants.
2. Calcule une note sur 100 pour chacun des 16 postes, heure par heure, pour le loup et la dorade.
3. Calcule la route depuis Poulx (ou ta position) et la fenêtre de pêche réelle : départ + route → retour.
4. Classe les postes et propose le meilleur, avec l'heure, la situation (scénarios A à J du guide) et le leurre.
5. Garde un carnet de sorties sur le téléphone. Chaque sortie, même bredouille, corrige la note du poste.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Les écrans (Sortie, Carnet, Infos) |
| `css/style.css` | Thème jour (carte marine) et nuit (sombre), bascule auto au lever et au coucher du soleil |
| `js/spots.js` | Les 16 postes : position, type, orientation vers la mer, notes de terrain |
| `js/model.js` | Le modèle : tous les coefficients, avec leur justification en commentaire |
| `js/app.js` | Chargement des données, carte, calcul du plan, carnet |
| `sw.js` | Permet d'ouvrir l'appli avec un réseau faible |

## Le modèle, en bref

`note = poste × saison × mer × lumière × vent × pluie × eau × carnet`

Chaque facteur vaut entre 0 et 100 % (110-120 % pour quelques bonus). La fiche d'un poste affiche chaque facteur et sa raison.

Niveaux de preuve dans le code : **[S]** sourcé, **[P]** pratique courante ou estimation, **[C]** lecture de carte.

## Sources

- Open-Meteo (prévisions, dont les modèles Météo-France) et Open-Meteo Marine (houle, température de l'eau)
- EMODnet Bathymetry, MNT 2024 (maille ~115 m)
- OSRM (temps de route), OpenStreetMap France, CARTO, Esri (fonds de carte)
- Ifremer / MARBEC, projet CONNECT-MED ; Parc national des Calanques, migrations de la daurade (2026)
- INPN, ZNIEFF « Plateau rocheux de Palavas-Carnon » ; Natura 2000 « Posidonies de la côte palavasienne »
- Département de l'Hérault, suivi topo-bathymétrique du golfe d'Aigues-Mortes (2023)
- Guide Notion « Loup au leurre du bord : de l'Espiguette à Palavas »
