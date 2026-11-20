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
