# Chenaux, graus et étangs : eau marron ou pêchable ? (essai du 20 nov. 2026, 8 h 25 – 9 h 20)

Branche d'essai `essai-chenaux`. Rien n'est sur `main` ; l'appli n'est pas modifiée.

## Données
- **Points** (`points.json`, 50) : choisis dans les polygones d'eau OpenStreetMap (Overpass, `osm.py`, `choix.py`) à au moins 15 m du bord : chenaux du Grau-du-Roi, du Lez à Palavas, graus de Carnon et de Frontignan, entrées de Port Camargue et de La Grande-Motte, Petit Rhône, étangs (Ponant, Or, Grec, Méjean, Arnel, Prévost, Ingril), et en mer à 300 m et 1 km. Écartés : Pertuis de la Fourcade (trop étroit), milieu des marinas (bateaux dans le pixel).
- **Images** : Sentinel-2 L2A, pixels de 10 m, AWS Open Data / Earth Search, **sans compte** (`s2.py`, tâche GitHub, une par année). Collection 1 + ancienne collection pour 2017-2018 et 2022. 32 287 mesures, **19 658 gardées** (sans nuages, pixel d'eau), **804 dates** de janv. 2017 au 7 nov. 2026.
- Débits Hub'Eau et pluie ERA5 de l'essai turbidité (2020 → 18 nov. 2026).

## Indice de turbidité
- ρ = rouge − proche infrarouge (B4 − B8 : retire reflets et brume). Calé sur la turbidité Copernicus Marine aux points en mer communs (3128 paires) : **FNU ≈ 402 × ρ^0,93**, corrélation (log) 0,86, erreur typique ×1,5 (`analyse/calage.json`).
- **Sature au-delà de ~30** : les jours à plus de 30 FNU (Copernicus) sortent à ~25. Une eau franchement marron ressort vers 35-50 sur cet indice. C'est donc un **indice**, pas une mesure exacte en FNU au-delà de 30.

## Résultats [M]
- **Grau-du-Roi, chenal (Vidourle)**, 413 jours sans nuages (`analyse/crues_resultat.txt`) :
  - débit normal : indice 5 (90 % < 8) ;
  - **eau marron (indice > 30) seulement quand le Vidourle était ≥ 5,6 fois la normale la veille** (8 jours, tous le lendemain d'un jour ≥ 4×) ; jamais en dessous de 4× (max 25) ;
  - après le dernier jour ≥ 4× : 1-2 j indice médian 14 (30 % > 30) ; 3-4 j : 11, max 18 ; **dès le 5e jour : normal** (max 12-18).
  - Exemple : 21 mai 2024, Vidourle 4,3× la veille, chenal presque clair (indice 11).
- **Étang du Ponant** : même comportement, un peu plus chargé (normal 9, marron à ≥ 5× la veille ; 4 cas sur 5 à 8-15×).
- **Mer à 300 m du Grau-du-Roi** : panache marron 1-2 j après (médiane 11, 7 % > 30), normal dès le 3e jour.
- **Petit Rhône** : toujours chargé (indice 19-25) ; l'indice sature (le rouge monte, le proche infrarouge aussi) → pas de seuil fiable avec ce calcul.
- **Lez à Palavas, graus de Carnon et de Frontignan, entrée de La Grande-Motte** : **pas de signal exploitable** (Lez : corrélation 0,02-0,17 avec le débit). Chenaux de 30-40 m bordés de quais et de bateaux : 3-4 pixels, mélangés. Il faudra les webcams et le carnet.
- Étangs (Or, Grec, Méjean, Arnel, Prévost, Ingril) : naturellement chargés (indice 10-15), peu liés à la pluie des 3 jours sur les jours sans nuages.

## Règle proposée pour « Pêchable ? » (Grau-du-Roi, Ponant) [M] sur peu de cas, seuils [P]
- Vidourle ≥ 5× la normale hier ou aujourd'hui → **non** (eau marron probable).
- Vidourle 2-5×, ou dernier jour ≥ 4× il y a 1-4 j → **douteux** (teintée).
- Sinon → **oui**.
À caler avec l'avis de Nico sur la planche `galerie_grau_du_roi.jpg` (A et B marron, C presque clair à 4,3×, D normal) et avec le carnet.

## Limites
- Seulement les jours sans nuages : après les gros orages le ciel reste souvent couvert (8 jours marron seulement).
- Débit journalier de la veille : une montée dans la journée n'est pas vue.
- Points à 15-30 m des quais : pixels parfois mélangés.
