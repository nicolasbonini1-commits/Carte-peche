# Carte de pêche – loup & dorade

Application web (téléphone) pour choisir son poste de pêche du bord entre **Saintes-Maries-de-la-Mer et Frontignan**, selon la météo et la mer réelles, l'heure, le temps disponible et l'espèce visée.

Adresse : https://nicolasbonini1-commits.github.io/Carte-peche/

## Ce que fait l'appli

1. Récupère en direct la météo (vent, rafales, nuages, pluie) et la mer (houle, direction, période, température de l'eau) pour 3 zones de la côte, plus la pluie sur les bassins du Vidourle et du Lez, sur les 7 derniers jours et les 7 prochains. Météo-France (AROME puis ARPEGE) jusqu'à environ 4 jours, puis ECMWF ; les deux modèles sont comparés.
2. Récupère le débit mesuré du Rhône, du Vidourle et du Lez (Hub'Eau, données Vigicrues) et le compare au débit habituel du mois.
3. Calcule une note sur 100 pour chacun des 16 postes, heure par heure, pour le loup et la dorade.
4. Calcule la route depuis Poulx (ou ta position) et la fenêtre de pêche réelle : départ + route → retour.
5. Classe les postes et propose le meilleur, avec l'heure, la situation (scénarios A à J du guide) et le leurre.
6. Garde un carnet de sorties sur le téléphone. Chaque sortie, même bredouille, corrige la note du poste.
7. Annonce les 3 prochains jours : coup de mer et mer qui retombe, vent d'est ou marin, mistral ou tramontane fort, vent qui forcit, fortes pluies sur les bassins, désaccord entre modèles.

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

- Open-Meteo : modèles Météo-France (meteofrance_seamless) et ECMWF (ecmwf_ifs025) ; Open-Meteo Marine (houle MFWAM de Météo-France sur cette côte, température de l'eau)
- Hub'Eau Hydrométrie (données Vigicrues) : débits horaires et débits moyens mensuels depuis 1990 (Rhône à Tarascon, Vidourle à Gallargues, Lez à Lattes)
- OpenStreetMap (feux des ports) pour les positions des postes, vérifiées le 18 nov. 2026
- EMODnet Bathymetry, MNT 2024 (maille ~115 m)
- OSRM (temps de route), OpenStreetMap France, Esri (fonds de carte)
- Ifremer / MARBEC, projet CONNECT-MED ; Parc national des Calanques, migrations de la daurade (2026)
- INPN, ZNIEFF « Plateau rocheux de Palavas-Carnon » ; Natura 2000 « Posidonies de la côte palavasienne »
- Département de l'Hérault, suivi topo-bathymétrique du golfe d'Aigues-Mortes (2023)
- Guide Notion « Loup au leurre du bord : de l'Espiguette à Palavas »
