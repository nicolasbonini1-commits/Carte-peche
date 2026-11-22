# Chantier 4 — Poste 17 (vidéo Fada2pêche, Camargue, hors secteur)

Branche `essai-poste17` (outils), résultats dans `essais-poste17/passage-*` (jamais `donnees`). Pas encore sur `main`.
Vidéo : « PECHE DU LOUP/BAR EN BORD DE MER AU LEURRE », chaîne Fada2pêche, publiée le 14 févr. 2025 (28:45), loup 3,61 kg au leurre de surface [V].

## Étape 1 — lieu (22 nov. 2026, confirmé par Nico à 16 h 30)
- Overpass injoignable depuis le chat ET depuis GitHub (passe du 22 nov. 15 h 38-16 h 17 : 36 essais, 0 réponse ; overpass-api.de « fetch failed » en 0,2 s). Contournement : API officielle OSM (`/api/0.6/map`, 5 boîtes) + Nominatim → OK en 2 min (passe 16 h 18-16 h 20).
- Repères OSM [M] : phare de Beauduc 43,36464 / 4,58454 (way 677380045) ; grau de la Dent 43,34964 / 4,66276 (way 11982921) ; phare de Faraman 43,35473 / 4,68710 (way 102075245, rayé blanc et noir) ; pointe de Saint-Raymond 43,35710 / 4,61809 ; pointe de Capeau 43,35744 / 4,65111. « Digue de Véran » : absente d'OSM et de Nominatim.
- Photo Esri (World Imagery) du **25 mars 2025** (vues 4,58 à 4,62) et du 22 juill. 2025 (4,64 à 4,76), date lue par `identify` [M].
- Lecture de la photo (à ± 100 m, mesuré à l'œil sur les pixels) : ligne de blocs cassés en mer (ancienne digue frontale) de ≈ 43,3601 / 4,5885 (600 m au SE du phare) à ≈ 43,3572 / 4,6015, à 100-200 m du bord ; puis la digue redevient le bord de mer avec de grands plats de sable et l'étang derrière ; épis à partir de ≈ 4,625 E (dessinés dans le trait de côte OSM, pas étiquetés `groyne`). Longueur phare → épis ≈ 2,6 km (mémoire Hurtrez : digue de 2,7 km).
- Digue frontale : construite en 1972, ≈ 200 m du rivage, des cabanons de Beauduc à La Courbe (Suanez & Bruzzi 1999, core.ac.uk 52999177) [G].
- Faraman (4,69-4,72) : 4 indices sur 7 seulement (pas de blocs au large, plage étroite).
- Photos IGN datées (2012, 2018, 2024, ortho-express 2025) : images blanches ou « LayerNotDefined » → pas de comparaison avant/après effondrements.

## Étape 2 — accès et réglementation (22 nov. 2026)
- **Cantonnement de pêche du golfe de Beauduc** (toute pêche interdite) : points A 43,44273 / 4,54228, B 43,43690 / 4,55957, C 43,41344 / 4,54334, D 43,41904 / 4,52561 (Fiche PNRC réglementation ; projet de renouvellement « sans limitation de durée », agriculture.gouv.fr 139001). Distance au début des blocs : ≥ 7 km → hors zone.
- **ZPB pointe de Beauduc, partie marine** (arrêté du 15/07/2015, JO 09/12/2015, en vigueur selon AIDA) : 257 ha, sommets entre 43,373 et 43,400 N, 4,550 et 4,592 E ; interdits : véhicules à moteur en tout temps, chiens en divagation 1/4-30/9, camping/bivouac, survol < 500 m ; pêche à pied avec engins interdite seulement dans la sous-zone d'herbier (≈ 19 ha, vers 43,393-43,400 / 4,573-4,581). **Pêche du bord à la ligne non visée.** Distance au début des blocs : ≥ 3 km → hors zone marine.
- **ZPB partie terrestre** (arrêté préfectoral 30/09/2013, n° 2013273-0017, RAA 193) : parcelles RC 9 et RD 1 « Les Sablons » (186 ha), limites exactes non vues → le trajet à pied depuis Beauduc la traverse probablement ; véhicules interdits.
- Accès : piste de ≈ 10 km depuis Salin-de-Giraud, gabarit 2,08-2,10 m (Tourvielle), parking public 6 h-22 h ; véhicules tolérés sur la plage de Beauduc (couloir), interdits sur la pointe des Sablons. Travaux votés en juin 2026 (18 000 €) sur 4 km de digue à la mer dégradée menant à Beauduc : état actuel non vérifié.
- Trajet à pied estimé (OSM, vol d'oiseau par segments) : du sentier sableux 685971637 (`motor_vehicle=no`, départ 43,3968 / 4,5843) → phare 5,1 km → début des blocs 6,2 km → début des épis 8,1 km. Position exacte du parking non relevée (hors des boîtes OSM).
- Digues des salins (`Digue des Pétroliers`, digue frontale 685977506, `Digue à la Mer` de Faraman) : `access=private` dans OSM → marcher sur la plage (domaine public maritime).
- Plan PNR 2014 (ancien) : « zone dévolue à la pêche (surfcasting) du 01/10 au 31/03 » sur la plage de Beauduc.
- Réserve naturelle nationale de Camargue : aucune relation OSM dans les boîtes 4,555-4,77 E → secteur a priori hors RNN (à revoir si OSM incomplet).

## Étape 3 — position, autour, parking, chemin (22 nov. 2026, en attente de validation par Nico)
- Passages : `essais-poste17/passage-22-17h19` (`position.js` : OSM nord, routeur, EMODnet, vues 600 m) et `passage-22-17h22` (`vue.js` : vue d'ensemble Esri + IGN). Image de contrôle et calcul du chemin : `essais-poste17/controle-22-17h30/`.
- **P = rive ouest du grau de l'étang de Beauduc** 43,36147 / 4,59261 (lu sur la photo Esri du 25 mars 2025, contrôlé en vue 600 m ≈ 0,9 m/pixel) : pointe de sable à l'embouchure du grau, ligne de blocs de l'ancienne digue à ≈ 230 m au large. Côté phare : aucune eau à traverser depuis le parking.
- Autour (par la plage, vol d'oiseau ≈ trajet, plage droite) : **a** racine de l'ancienne digue sous le phare 43,36206 / 4,58453 (656 m) ; **b** plage face à la ligne de blocs 43,36179 / 4,58875 (314 m).
- **c écarté** : jonction blocs / rivage, rive est du grau, 43,35706 / 4,60021 (786 m) ; colle le mieux aux captures 5, 7, 9, 10 et a l'eau la plus profonde (EMODnet ≈ 2,7-3,4 m au pied), mais il faut traverser le grau (chenal ≈ 70 m sur la photo, profondeur et courant inconnus) → non joignable à pied tant que ce n'est pas vu sur place (règle du 20 nov.).
- EMODnet (maille ≈ 115 m, cap 215°) : P −0,9 m, +2,3 à 50-100 m (maille ancienne : la côte a bougé, peu fiable), −2,5 à 300 m, −3,7 à 500 m ; a +0,1 / −3,4 à 300 m ; b −0,5 / −2,3 à 200 m ; c −2,7 / −3,4 à 100 m / −5,7 à 500 m.
- **Parking** : OSM way 240666081 (`amenity=parking`, `access=yes`, `fee=no`, sable) 43,40731 / 4,59691, au bout de la piste à Beauduc (lieu-dit OSM « Beauduc » 43,4024 / 4,5956). Lien avec le « parking public 6 h-22 h » de l'étape 2 non vérifié.
- **Chemin réel** (calcul dans le chat : chemins OSM publics + trait de côte OSM, raccords sur le sable ≤ 150 m) : **≈ 9,1 km** = pistes 0,6 km → plage du golfe 1,7 km → sentier sableux 685971637 (`motor_vehicle=no`) 4,4 km → plage sud 2,1 km (dont 0,74 km phare → P). ≈ 2 h à 4,5 km/h, plus sur sable mou. Le routeur piéton FOSSGIS donne 13,3 km avec P « accroché » à 3,6 km d'un chemin : inutilisable ici. Digues des salins (`access=private`) : non comptées.
- Date des photos : 25 mars 2025 (identify Esri de l'étape 1) ; le service de métadonnées Esri répond 404 depuis 17 h 22. IGN (ortho actuelle, date inconnue) : vue d'ensemble reçue, pas encore comparée.

## Reste à faire
3. Fait (22 nov., 17 h 30), en attente de validation de Nico : P, a, b, parking, chemin.
4. Limites de la fiche : hors secteur, bouée Candhis la plus proche, couleur de l'eau non réglée ici (Grand Rhône).
6. Procédure habituelle (REPRISE.md, essai Chrome, cache v21, accord de Nico, `main`).
- Petit défaut corrigé (commentaire de `lieu.js`, 17 h 18).
