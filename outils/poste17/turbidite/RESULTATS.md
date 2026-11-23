# Poste 17 (pointe de Beauduc) — couleur de l'eau à P (tâche de nuit A, 23 nov. 2026)

Branche d'outils `essai-poste17`. **Rien n'est dans `js/model.js`** : ce qui suit est une proposition pour Nico.
Niveaux : [S] sourcé, [M] mesuré/calculé ici, [C] lu sur une carte, [P] estimation.

## D'où viennent les chiffres
- Turbidité TUR (FNU) Copernicus Marine, même produit et même lecture que l'essai turbidité (`OCEANCOLOUR_MED_BGC_HR_L3_NRT_009_205`,
  couche `…_tur-spm-chl_nrt_l3-hr-mosaic_P1D-m_202107/TUR`, WMTS GetFeatureInfo sans compte, zoom 14) [S].
  Script : `telecharger.py` (copie adaptée de `outils/turbidite/telecharger.py`, original non modifié).
  Passage GitHub https://github.com/nicolasbonini1-commits/Carte-peche/actions/runs/45084253236 (23 nov., 0 h 45 → 1 h 15),
  résultats `essais-poste17/passage-23-00h37/A2-turbidite/` (commit 267b178). 2517 dates dans la couche (1er janv. 2020 → 21 nov. 2026, la couche n'a pas encore le 22),
  466 dates avec au moins une valeur à P 1 km ou au témoin, 6470 requêtes, 0 échec, 29 min [M].
- Points (P = 43,36147 / 4,59261, direction 186°) et pixel réellement lu [M] :
  | point | demandé | pixel lu | valeurs |
  |---|---|---|---|
  | P à 300 m (`17_300`) | 43,35879 / 4,59222 | 43,35880 / 4,59193 | **360** |
  | P à 1 km (`17_1000`) | 43,35254 / 4,59132 | 43,35231 / 4,59193 | 434 |
  | témoin à 5 km (`17_5000`) | 43,31680 / 4,58615 | 43,31713 / 4,58664 | 431 |
  | Faraman à 1 km (`faraman_1000`, repère) | 43,34580 / 4,68581 | 43,34583 / 4,68585 | 374 |
  | large du Grand Rhône (`rhone_PSL`, même point que l'essai turbidité) | 43,30 / 4,85 | 43,29954 / 4,84987 | 401 |
- Conditions : relevés déjà téléchargés de `essais-turbidite-releves` (19 nov.) : Rhône à Tarascon (Hub'Eau, jusqu'au 18 nov.), météo ERA5 et houle `era5_ocean`
  de la zone E (point demandé 43,40 / 4,30 ; ERA5 donne 43,48 / 4,32 ; houle 43,50 / 4,00), à 24 km de P et plus [M]. Paires utilisables jusqu'au 13 nov. 2026.
- Chaîne : `analyse.py` = mêmes calculs que `features.py` / `indice.py` / `final.py` (houle au poste par la règle de l'appli, seaward 186°, pas de facteur « grau » [P] ;
  conditions à 11 h ; débit de la veille ÷ médiane du mois depuis 1990 ; mémoire du Rhône τ = 8 j).
  Coefficients communs **fixés** (M.TURB de `main` v20) : hsmax48 0,3653 ; hs 0,1732 ; ws24 0,1049 ; pluie 0,0431. Seuls **base** et **k Rhône** sont calés (2020-2024), test 2025-2026.
  Vérification de la chaîne avant l'essai : avec les mesures du poste 2 à la place de P, elle redonne base 0,3317 et k 0,8386 (appli : 0,3324 et 0,8459) [M].
- Relancé dans la session sur les mêmes fichiers : `analyse.json` identique (diff vide) ; même calcul à 1 km : `essais-poste17/controle-23-01h17/` (commit e284117).

## Proposition (point à 300 m, comme les 16 autres postes ; 360 valeurs ≥ 50) [M]
- **base = 0,596** (3,9 FNU par mer calme et Rhône normal ; erreur type 0,016) ; **k Rhône = 0,378** (erreur type 0,127 ; Rhône 2 × la normale → ×1,30 ; 4 × → ×1,69).
- Calage 210 jours (2020-2024), test 150 jours (2025-2026).

| test 2025-2026, P à 300 m | R² | rang | bonne classe (4 classes) | à une classe près |
|---|---|---|---|---|
| **poste 17 calé** | **0,411** | **0,676** | **73 %** | 99 % |
| copie du poste 1 (sans calage) | −0,02 | 0,64 | 61 % | 97 % |
| copie du poste 2 | −0,14 | 0,66 | 55 % | 96 % |
| copie du poste 3 | −0,64 | 0,67 | 35 % | 94 % |

- **Ancienne règle `M.water`** (3 classes, test) : bonne classe **9 %**, rang 0,38, 19 jours « teintée ou plus » annoncés « claire » sur 46 ; indice calé : **81 %**, rang 0,68, 0 sur 46.
- Pourquoi l'ancienne règle s'effondre ici : à 300 m, P n'est presque jamais « claire » (1 jour sur 150 en test ; médiane 8,1 FNU quand le Rhône est normal), alors que l'ancienne règle dit « claire » la plupart du temps.

### À lire avant d'adopter : le point à 300 m est plus trouble que ses voisins
- Mêmes jours que l'essai turbidité (292 jours) : médiane à 300 m **P 8,4 FNU**, poste 1 4,4, poste 2 4,4 [M]. À 1 km, P n'a que 3,0 FNU de médiane.
- Causes possibles, non tranchées [P] : fond à ≈ 2,5 m (EMODnet, étape 3) qui éclaircit le pixel, ligne de blocs à ≈ 230 m (vagues qui cassent dessus, pixel de 100 m de 250 à 350 m),
  eau de l'étang de Beauduc qui sort par le grau juste à P. Ce que voit le pêcheur au bord est peut-être plus proche du 300 m que du 1 km, mais rien ne le prouve : **à caler avec le carnet**.
- Même calcul à **1 km** (434 valeurs) : base 0,166 (1,5 FNU), k 0,692 (± 0,146 ; 2× → ×1,61) ; test R² 0,534, rang 0,705, bonne classe 70 % ; ancienne règle 71 % (3 classes), indice 71 %.
  À 1 km l'ancienne règle n'est donc pas mauvaise ; le gain de l'indice porte sur le rang (0,52 → 0,71) et sur les « teintée » annoncées « claire » (7 → 0 sur 22).

## Le panache du Grand Rhône atteint-il P ? [M]
**Oui, l'eau de P se charge nettement quand le Rhône est haut**, mais beaucoup moins qu'au large du Grand Rhône, et le calcul ne prouve pas que ce soit l'eau du Grand Rhône
(les jours de Rhône haut sont aussi des jours de pluie : Petit Rhône, ruissellement, étangs et grau de Beauduc) [P].
Médiane de TUR (FNU) et nombre de jours par classe du Rhône à Tarascon (débit de la veille ÷ normale du mois), 2020 → 13 nov. 2026, tous les jours mesurés :

| point | < 1,5 | 1,5-2,5 | 2,5-4 | > 4 |
|---|---|---|---|---|
| **P à 300 m** | 8,1 (327 j) | **15,9** (27 j) | **22,8** (6 j) | — (0 j) |
| P à 1 km | 3,0 (383 j) | 8,5 (40 j) | 13,1 (10 j) | 29,2 (1 j) |
| témoin 5 km | 1,7 (380 j) | 3,5 (39 j) | 4,1 (10 j) | 5,3 (1 j) |
| Faraman 1 km | 7,1 (332 j) | 26,5 (32 j) | 25,1 (9 j) | 87,3 (1 j) |
| large du Grand Rhône | 4,0 (353 j) | 45,8 (37 j) | 99,0 (9 j) | 172 (1 j) |

- Mer calme seulement (houle max 48 h < 0,5 m), P à 300 m : 7,5 (266 j) → 14,4 (20 j) → 19,8 (3 j) ; à 1 km : 2,7 → 7,9 (26 j) → 6,9 (3 j). L'effet reste sans houle.
- Rhône haut : × 11 au large du Grand Rhône, × 3,7 à Faraman, × 2 (300 m) à × 2,8 (1 km) à P. Ça diminue vers l'ouest, ce qui va avec un panache qui s'étale vers Beauduc, mais le témoin à 5 km double aussi (× 2) : une partie est un effet « toute la côte chargée ».
- Jours par classe sur tous les jours 2020 → 18 nov. 2026 (avec ou sans satellite) : < 1,5 : 2171 ; 1,5-2,5 : 298 ; 2,5-4 : 41 ; > 4 : 3. Sur les 465 jours mesurés : 409 / 44 / 11 / 1.
- Comparaison aux postes de l'appli, mêmes jours avec Rhône ≥ 1,5 (24 j) : P 300 m 17,1 FNU ; poste 1 39,9 ; poste 2 12,4. P réagit moins que le poste 1 (embouchure du Petit Rhône), autant que le poste 2.

## Après un pic du Rhône ≥ 1,6 fois la normale [M]
Jours depuis le dernier jour ≥ 1,6 (débit de la veille = 0 j). « Fois la normale » = médiane du groupe ÷ médiane des jours sans pic depuis 21 jours.

| P à 300 m | sans pic (21 j) | 0-2 j | 3-5 j | 6-8 j | 9-12 j | 13-20 j |
|---|---|---|---|---|---|---|
| tous les jours | 7,9 FNU (265 j) | ×2,08 (35 j) | ×1,56 (11 j) | ×1,14 (6 j) | ×1,34 (15 j) | ×1,03 (28 j) |
| mer calme | 7,3 (220 j) | ×2,17 (25 j) | ×1,55 (8 j) | ×1,36 (5 j) | ×1,07 (10 j) | ×1,03 (21 j) |

- À 1 km : ×3,6 (0-2 j, 55 j) ; ×1,9 (3-5 j) ; ×1,3 (6-8 j, 6 j) ; ×1,8 (9-12 j, 20 j) ; ×1,6 (13-20 j) ; mer calme ×3,0 / ×2,0 / ×1,4 / ×1,2 / ×1,4.
- **Réponse simple** : l'excès est divisé par deux en 3-5 jours ; l'eau redevient proche de la normale (moins de 1,25 fois, seuil [P]) **vers 6 à 12 jours** après le dernier pic.
  Peu sûr : 5 à 20 jours par groupe, crues souvent à la suite, et les jours « sans pic » sont surtout l'été (calme, eau claire). Pour les postes 1-2, l'essai turbidité disait « encore 4 à 5 fois l'eau normale 4 à 8 jours après » : P se remet plus vite.

## Limites
- Seulement les jours sans nuages (466 sur 2517) ; lendemains de pluie et de tempête sous-représentés.
- Météo, houle et pluie de la zone E, à 24 km et plus de P (houle ERA5 à 43,50 / 4,00, à ≈ 50 km) : le calage absorbe une partie de l'écart, pas tout.
- Débit total du Rhône à Tarascon (Grand + Petit Rhône) : on ne sépare pas les deux bras.
- Grau de l'étang de Beauduc à P : effet inconnu, non modélisé.
- Seuils des classes (4 / 10 / 30 FNU) [P], pas calés sur ce que voit Nico.

## Pour la tâche B (intégration sur une branche d'essai)
Si Nico l'accepte : `M.TURB.base[17] = 0.596` et `M.TURB.rivers.rhone.k[17] = 0.3776` (point à 300 m) ; variante 1 km : 0.1657 et 0.6915.
Le poste a besoin de `river: "rhone"`, `seaward: 186`, zone E (seule zone possible) ; la houle viendrait d'Espiguette (voir la fiche, A1).
Les fichiers bruts : `essais-poste17/passage-23-00h37/A2-analyse/analyse.json` (300 m) et `controle-23-01h17/1km/analyse.json` (1 km).
