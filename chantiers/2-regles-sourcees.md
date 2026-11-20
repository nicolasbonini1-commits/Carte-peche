# Chantier 2 — Règles sourcées : leurres, mer, saison, lune, couleur de l'eau

Phrase de reprise : « reprise pêche chantier 2 : chantiers/2-regles-sourcees.md ». Lire aussi `chantiers/REGLES-COMMUNES.md`, REPRISE.md, LECONS.md (maison3d) et LECONS.md (ce dépôt), skill coach-peche.
Branche : `chantier-2-regles`. Fichiers : `js/model.js` (sauf `M.HABITAT`, voir chantier 1), guide Notion (après accord), skill coach-peche (proposition de modification).

## Pourquoi
Nico refuse une règle fixe fondée sur ses seuls dires ou sur le guide Notion non vérifié. Le 20 nov., le plan de sortie a montré deux trous : l'ordre des leurres ignore la température de l'eau et la saison (surface toujours en premier à l'aube par mer calme) ; la lune n'était pas prise en compte (pleine lune → aube moins productive, d'après le guide, à revérifier).

## Étapes proposées
1. Inventaire : chaque règle chiffrée de `js/model.js` (SEA_LOUP / SEA_DORADE et grille mer, houle longue ≥ 8 s, `M.SEASON`, lumière, vent, couleur de l'eau et son escalier, `M.lureSequence`, lune, scénarios A à J) → tableau règle / valeur / source actuelle / niveau de preuve.
2. Pour chaque règle [P] ou venant du guide : chercher une source solide (études Ifremer, articles scientifiques sur le bar, ouvrages, sources officielles), ouvrir et relire le passage, noter le lien. Pas de source → rester [P] « à vérifier », ou [N] si Nico a une expérience précise (dernier recours).
3. Premières règles demandées : profondeur et vitesse du leurre selon température de l'eau et saison (pistes déjà vues, magazines seulement : eau d'hiver 12-15 °C, poissons près du fond, animation lente — à confirmer par mieux) ; effet de la lune ; grille mer.
4. Proposition en attente depuis le 20 nov. : lisser la couleur de l'eau sur log(FNU) au lieu de l'escalier (voir HISTORIQUE.md, « Fin d'après-midi du 20 nov. »).
5. Coder sur la branche, essai Chrome sans écran (`outils/essai_sortie.js`, branche `essai-sortie-21nov`, réutilisable), accord de Nico avant `main`.
6. Mettre à jour le skill coach-peche §3 (niveaux de preuve) avec les règles communes.

## Inventaire des règles chiffrées de `js/model.js` (20 nov. 19 h, `main` caf302f)
Niveau actuel = ce que dit le code ; « [S] cité » = source nommée dans un commentaire mais lien jamais ouvert.

| Règle | Valeur | Niveau actuel | Source trouvée le 20 nov. |
|---|---|---|---|
| `M.SEASON` loup | 0,30 (juil.) → 1,00 (nov.), déc. 0,90, janv. 0,80 | [S] cité | Ponte en mer de déc. à mars, pic en janvier ; 50-59 % des loups suivis sont restés tout l'hiver dans l'étang du Prévost (Mignucci et al. 2023) [S] |
| `M.SEASON` dorade, `M.GRAU_AUTUMN` | ×1,10 à 1,25 sept.-déc. | [S] cité / [P] | pas encore cherché |
| Houle au poste `localWave` | 0,35 + 0,65 cos(angle), grau ×0,8 | [P] | — |
| Classes de mer | 0,3 / 0,8 / 1,8 m | [P] | — |
| Houle longue | ≥ 8 s → classe au-dessus | physique [S], effet [P] | — |
| Grilles `SEA_LOUP`, `SEA_DORADE`, note /5 | tableau | guide Notion / [P] | rien de scientifique attendu → carnet |
| Mer qui retombe | ×1,15 loup, ×1,10 dorade | guide / [P] | — |
| Lumière loup | aube/crépuscule 1,0 ; jour calme 0,45, peu agitée 0,6, sinon 0,85 ; couvert +0,1 ; nuit sombre 0,85, claire 0,75, éclairée +0,1 | [P] | Activité du loup : nocturne seul, diurne en groupe (Bégout Anras et al. 1997, bassin de La Rochelle) ; pas d'écart jour/nuit dans l'usage de l'espace au Prévost (Mignucci 2023). Rien sur l'aube. |
| Lune | nuit sombre si lune < 35 % ou nuages ≥ 70 % ; rien à l'aube | [P] | **aucune étude sur le loup trouvée** (la revue Andrzejaczek 2024 porte sur thons, espadons, requins) |
| Fenêtres aube / crépuscule | −60 / +75 min | [P] | — |
| Vent | de face ≥ 35 km/h ×0,8 ; rafales ≥ 60 ×0,6 ; dorade ≥ 50 ×0,75 | [P] | — |
| Pluie (si pas de turbidité), `API_K` 0,85 | | méthode [S], valeurs [P] | — |
| Seuils fleuves | Rhône 1,5/2,5/4 ; autres 2/4/10 | [M] Rhône, [P] autres | — |
| Couleur de l'eau `M.TURB` | coefficients | [M] ; classes [P] | — |
| `WATER_LOUP` / `WATER_DORADE` | piquée ×1,05, très chargée ×0,6… | guide Notion | à revérifier |
| `M.PECHABLE` | 5× / 4× | [M] + planche validée par Nico | — |
| Température loup | < 11 °C ×0,8 ; < 13 ×0,9 ; > 24 ×0,7 | [P] | Arrêt de l'alimentation vers 7 °C (Kara & Quignard 2018, cité par Mignucci 2023) ; métabolisme de base 36 / 65 / 89 / 91 mg O₂/kg/h à 10 / 15 / 20 / 25 °C (Claireaux & Lagardère 1999) ; 24 °C = température optimale d'élevage (Rodde et al. 2020) → la pénalité > 24 °C n'a pas d'appui |
| Température dorade | < 12 °C ×0,6 ; < 14 ×0,85 | [P] | pas encore cherché |
| `M.lureSequence` | toujours surface → sous la surface → fond ; ignore température et saison | guide / [P] | aucune étude ne dit « loup près du fond en eau froide » (seulement magazines) ; le métabolisme plus lent en eau froide est [S] |
| `M.colorFor` | coloris selon eau et lumière | guide Notion | à revérifier |
| Carnet `learnFactor` | a = 4 | choix statistique [P] | — |
| Alertes, sécurité | houle 1,5 / 2,5 m, vents 30 / 45 km/h, rafales 75, pluie 40 mm/24 h ; sécurité houle ≥ 1,5 m sur digue/roche ou rafales ≥ 70 | [P] | — |

Sources ouvertes et relues :
- Mignucci et al. 2023, étang du Prévost, 58 loups suivis 2017-2021 : https://archimer.ifremer.fr/doc/00849/96070/104122.pdf (§ 3.1, 3.2, 3.3.1, 4.2)
- de Pontual et al. 2023, ICES JMS (Atlantique, pas de profondeur par saison) : https://archimer.ifremer.fr/doc/00841/95273/103029.pdf
- Bégout Anras, Lagardère & Lafaye 1997, Can. J. Fish. Aquat. Sci. 54 : https://www.vliz.be/imisdocs/publications/ocrd/121102.pdf
- Claireaux & Lagardère 1999, J. Sea Res. 42 (résumé seulement) : https://doi.org/10.1016/s1385-1101(99)00019-2
- Rodde et al. 2020, Front. Mar. Sci. : https://doi.org/10.3389/fmars.2020.578976

## État
- 20 nov. 18 h 45 : fiche créée, rien commencé.
- 20 nov. 19 h : étape 1 (inventaire) faite ; étape 3 commencée (température, lune, lumière, saison du loup).
- 20 nov. 19 h 05 (accord de Nico à 18 h 56) : **règle « eau froide » codée** dans `M.lureSequence` (`M.COLD_WATER = 14`) : sous 14 °C, fond en premier, puis sous la surface, surface en court essai (5 min), toutes les animations ralenties ; température inconnue → ordre habituel. Testée dans Node seulement (6 cas, dont le seuil 14,0 °C). `app.js` non touché : l'explication est dans le texte de l'étape.
- Reste avant `main` : essai Chrome sans écran avec les vraies réponses (`outils/essai_sortie.js`), cache suivant libre dans `sw.js` (v15 réservé), accord de Nico.
- Suite : la grille de mer (`SEA_LOUP`, `SEA_DORADE`), la dorade (saison, `GRAU_AUTUMN`, température), revérifier `WATER_LOUP` et `colorFor` (viennent du guide Notion), pénalité > 24 °C (sans appui), lune (rien trouvé : chercher encore ou garder [P]), lissage de la couleur de l'eau (étape 4). Limite : la température utilisée est celle prévue par Open-Meteo Marine pour la zone, pas mesurée au poste.
