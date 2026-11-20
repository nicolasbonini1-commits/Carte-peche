# Simulation « couleur de l'eau » 2020 – 2026 (essai du 19-20 nov. 2026)

Branche d'essai `essai-turbidite`. Rien n'est sur `main` ; l'appli n'est pas modifiée.

## Données
- Turbidité mesurée par satellite (Sentinel-2, pixels de 100 m) : Copernicus Marine, produit
  `OCEANCOLOUR_MED_BGC_HR_L3_NRT_009_205`, couche `…_tur-spm-chl_nrt_l3-hr-mosaic_P1D-m_202107/TUR` (FNU),
  lue par WMTS GetFeatureInfo sans compte. **559 jours exploitables sur 2513** (1er janv. 2020 → 17 nov. 2026 ; nuages ou pas de passage les autres jours).
  Points : 300 m et 1 km au large de chaque poste (direction `seaward`), plus 4 témoins à ~5 km. Branche `essais-turbidite-satellite`.
- Débits moyens journaliers Hub'Eau (Rhône Tarascon, Vidourle Gallargues, Lez Lattes), débit de la **veille**, comparé à la médiane des débits mensuels depuis 1990 (comme l'appli).
- Vent, rafales, pluie : Open-Meteo archive (ERA5) aux 3 points de zone ; houle : Open-Meteo Marine `era5_ocean`. Branche `essais-turbidite-releves`.
- Conditions prises à 11 h (heure de Paris), heure du passage de Sentinel-2 (~10 h 30 UTC).
- Postes écartés à 300 m : 3 et 14 (moins de 50 valeurs), 8 (aucune : point dans les terres). Poste 5 à 1 km : valeurs suspectes (médiane 24 FNU quel que soit le temps), à revoir.

## Constats [M]
- Au large (5 km) : médiane 1,4 à 1,7 FNU. Près des postes (300 m) : médiane 3,9 FNU, 90 % des jours < 13 FNU.
- Règle actuelle de l'appli (`M.water`) : médianes 3,5 (claire) / 6,8 (piquée) / 17,7 FNU (teintée) → bon sens, mais
  73 jours « teintée » mesurés ont été annoncés « claire » sur la période de test.
- **Rhône** (Tarascon, débit de la veille / normale du mois) : 2 à 4 fois la normale → poste 1 de 5,5 à **79 FNU**, poste 2 à 1 km de 3,3 à 45 FNU, poste 3 de 3,1 à 10. Le rapport n'a jamais dépassé 5,2 depuis 2020 : les seuils de l'appli (2 / 4 / 10) sont trop hauts pour le Rhône.
  Après un pic ≥ 1,6 fois : encore 4 à 5 fois l'eau normale 4 à 8 jours après (postes 1-2).
- **Vidourle** : poste 6 (chenal du Grau-du-Roi) 5,4 FNU normal → 10,6 (2-4 fois) → 26 (4-10 fois) ; reste 2 fois plus trouble jusqu'à ~9 jours après un pic ≥ 4 fois (échantillon faible, plusieurs crues de suite possibles).
- **Lez** : effet faible aux postes 11-13 (2,6 → 3 à 5 FNU les 8 jours clairs à plus de 4 fois la normale).
- **Houle** (postes sans fleuve, hors crues) : houle au poste 0,5-0,8 m → 11,7 FNU (3,3 par mer calme) ; houle max sur 48 h 1,5-2 m → 22,9 FNU. « Mer qui retombe » : 12,6 contre 3,3 FNU, effet entièrement expliqué par la houle des 48 h précédentes.

## Indice proposé (`indice.py`, résultat dans `indice_resultat.json`)
log10(TUR) = base du poste + a·(houle max 48 h au poste) + b·(houle au poste) + c·(vent moyen 24 h) + Σ k(poste, rivière)·log10(mémoire du débit).
Mémoire du débit = max sur 15 jours de (rapport à la normale) × exp(−jours/τ), τ Rhône 8 j, Vidourle 1 j, Lez 5 j.
Calé sur 2020-2024, **testé sur 2025-2026** : R² 0,62, corrélation de rang 0,77 (règle actuelle 0,47).
Classes [P] : claire < 4 FNU, piquée 4-10, teintée 10-30, très chargée > 30.
Test 2025-2026 : bonne classe 68 % (règle actuelle 63 %), « teintée » reconnue 89 fois sur 214 (16 avec la règle actuelle), teintée annoncée claire 5 fois (73).
Limite : sous-estime les grosses crues (7 nov. 2026 : 10 à 18 FNU mesurés, 5 à 9 prévus) ; « très chargée » mal reconnue (6 sur 35).

## Limites
- Seulement les jours sans nuages : les lendemains de pluie et de tempête sont sous-représentés.
- À 300 m du bord, le fond peut éclaircir le pixel en eau peu profonde (plages) ; position de plusieurs postes « à vérifier ».
- Houle ERA5 grossière (~50 km) ; débit journalier de la veille.
- Les seuils des classes en FNU ne sont pas calés sur ce que voit Nico : champ « couleur de l'eau » à ajouter au carnet.

## Embouchures et chenaux : essai du 20 nov. 2026 (7 h 50 – 8 h 05)
Question : le panache des fleuves dépend-il du vent et de la houle ? Mêmes données (4081 paires mesure / conditions, 13 postes).
Deux validations : calé 2020-2024 et testé 2025-2026, et « une année laissée de côté » (7 essais, 2020 → 2026).
« Jours fleuve » = postes 1, 2, 4, 5, 6, 7, 9, 11, 12, 13 avec mémoire du débit ≥ 1,5 fois la normale (575 jours, 243 en test).
Scripts : `interactions.py`, `plafond.py`, `regional.py`, `final.py` (à lancer comme `indice.py`).

| Modèle | R² test | rang test | R² 1 an de côté | jours fleuve, erreur (1 an de côté) |
|---|---|---|---|---|
| indice en ligne | 0,622 | 0,767 | 0,641 | ×1,75 |
| + vent le long de la côte (panache poussé vers le poste) | 0,615 | 0,761 | 0,640 | ×1,75 |
| + vent de mer / de terre × fleuve | 0,624 | 0,768 | 0,640 | ×1,76 |
| + houle des 48 h × fleuve | 0,627 | 0,770 | 0,641 | ×1,76 |
| plafond du Rhône à 2 fois la normale | 0,629 | 0,770 | 0,648 | ×1,71 |
| + pluie des jours d'avant (côte) | 0,652 | 0,788 | 0,661 | — |
| plafond Rhône + pluie | **0,657** | **0,790** | **0,667** | — |

- **Vent et houle × fleuve : aucun gain** dans les deux validations ; les coefficients changent de signe d'un poste à l'autre
  (ex. vent le long de la côte : +0,17 au poste 2, −0,14 au poste 5) → bruit. Trop peu de jours de crue sans nuages (20 à 50 par poste) pour voir l'effet du vent sur le panache.
- **Rhône au poste 1** : l'indice sous-estime de 1,2 à 2 fois la normale (×1,3 à 1,4) et surestime au-delà de 3 fois (×2,3, seulement 4 jours) → le panache sature (ou le capteur). Plafonner le rapport à 2 : petit gain, à confirmer.
- **Pluie des jours d'avant sur la côte** (indice de pluie antérieure, déjà calculé dans l'appli) : gain le plus net (20 mm → ×1,35 ; 60 mm → ×1,5). Le 7 nov. 2026, Rhône normal mais postes 1, 2, 4, 5, 16 à 10-18 FNU : toute la côte chargée après les pluies (ruissellement, étangs, petits fleuves) ; un terme « crue régionale » Vidourle/Lez n'apporte presque rien de plus (×1,09).
- Embouchures 1, 6, 12 (test) : bonne classe 57 % → 60 %. L'intérieur des chenaux et les étangs restent invisibles (pixels de 100 m, points à 300 m) : seul le carnet (« couleur de l'eau ») pourra les caler.
- Rien de modifié dans l'appli.
