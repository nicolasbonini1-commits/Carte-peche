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
| `M.SEASON` dorade, `M.GRAU_AUTUMN` | ×1,10 à 1,25 sept.-déc. | [S] cité / [P] | 222 dorades suivies 2019-2022 : départ des lagunes vers la mer surtout en oct.-nov., pic mi-octobre (Berre dès sept.) ; lagunes de mi-avril à fin sept. ; reproduction surtout au large de Marseille (Thambithurai et al. 2026, Movement Ecology 14:10, doi 10.1186/s40462-025-00619-5) ; concentration près de Marseille d'oct. à début déc. (Parc national des Calanques) [S] → oct.-nov. appuyés, sept. et déc. non ; valeurs ×1,10-1,25 restent [P] ; **étang du Prévost (Palavas) : départ moyen le 6 oct. ± 6 j, aucun départ en sept. ni en déc., retour vers le 31 mars** (Mignucci et al. 2023, § 3.3.1) [S]. Lagunes suivies par Thambithurai : Prévost, Leucate, Thau, Berre ; seule Berre dès sept. **Effet réel : en oct., 1,00 × 1,25 est plafonné à 1 → le bonus d'octobre ne fait rien.** |
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
| Température dorade | < 12 °C ×0,6 ; < 14 ×0,85 | [P] | Élevage : forte baisse de l'activité et de l'alimentation en eau froide, arrêt de croissance (Sánchez-Nuño et al., essai 22 → 14 °C) ; prise de nourriture réduite sous 15 °C (Čolak et al. 2024, Naše more 71) ; en milieu naturel 11 °C l'hiver, départ vers plus profond quand la surface refroidit (cité par Sánchez-Nuño) [S, élevage] → sens de la règle appuyé, seuils [P] |
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
- 20 nov. 19 h 15 : **essai Chrome sans écran réussi** (tâche `essai-eau-froide`, résultats dans la branche `essais-eau-froide`) : 0 erreur JS, cache v16 actif ; eau réelle 16,4-17,2 °C → ordre habituel sur les postes 2, 7, 9, 6, 8 ; seuil forcé → fond en premier sur les 5 fiches, textes [S] / [P] affichés ; hors ligne puis retour du réseau : 16 postes, bandeau « Pas de réseau » puis mise à jour. Texte aligné le 20 nov. sur la leçon « [P] à vérifier affiché » (19 h 06). **Trou trouvé sur la capture** : la ligne « Leurre : » (carte « Meilleur choix » et haut de fiche, `sc.lure` dans `app.js` l. 718 et 790) ignore l'eau froide → correction proposée à Nico (hors périmètre : `app.js`).
- 20 nov. 21 h 27 : accord de Nico → `M.coldNote` ajoute la phrase eau froide à la ligne « Leurre : » (`app.js` l. 718 et 790, 2 lignes, hors périmètre avec son accord) ; 2e essai Chrome 21 h 29 réussi (carte « Meilleur choix » et 5 fiches) ; **fusionné sur `main`, cache v16**, 20 nov. 21 h 30 (publication Pages réussie, commit 1a2f8f6).
- Suite : la grille de mer (`SEA_LOUP`, `SEA_DORADE`), la dorade (saison, `GRAU_AUTUMN`, température), revérifier `WATER_LOUP` et `colorFor` (viennent du guide Notion), pénalité > 24 °C (sans appui), lune (rien trouvé : chercher encore ou garder [P]), lissage de la couleur de l'eau (étape 4). Limite : la température utilisée est celle prévue par Open-Meteo Marine pour la zone, pas mesurée au poste.
- 20 nov. 21 h 50 : sources dorade revérifiées (2 liens rouverts : Mignucci 2023 pour le Prévost, Thambithurai 2026 version Lancaster https://eprints.lancs.ac.uk/235647/1/40462_2025_Article_619.pdf). Proposition à Nico : `GRAU_AUTUMN` sept. et déc. à 1,0 ; nov. ×1,20 gardé [P] ; signalé que le bonus d'octobre est sans effet (plafond à 1). Rien codé.
- 20 nov. 21 h 51 (accord de Nico à 21 h 49) : `GRAU_AUTUMN` = { 10: 1,25, 11: 1,20 } (sept. et déc. retirés), cache v17, commit c8fb51b sur la branche. Essai Chrome sans écran 21 h 52 (tâche `essai-dorade-saison`, résultats dans `essais-dorade-saison`) : 0 erreur JS, cache v17 actif ; classement dorade de demain identique à `main` (novembre inchangé, attendu) ; modèle chargé dans Chrome : grau sept. 0,99 → 0,90 (note 94 → 86), déc. 0,44 → 0,40 (42 → 38), oct. et nov. et digue inchangés ; hors ligne : 16 postes + bandeau « Pas de réseau », retour du réseau : 16 postes, bandeau effacé. Captures regardées en entier. Vu en passant (hors périmètre, `app.js`) : « 64/100 pour le dorade » au lieu de « la dorade » dans la fiche. En attente : accord de Nico pour `main`.
- 20 nov. 22 h 08 (accord de Nico à 22 h 04, avec la correction « la dorade ») : 2 autres essais Chrome (22 h 05, 22 h 07) après correction — 3e occurrence « idéale pour le dorade » trouvée dans `model.js` l. 368 et corrigée ; 0 erreur, « pour la dorade » partout sur les fiches 6 et 8. **Fusionné sur `main` (041f271), cache v17, publié par Pages 22 h 08.** Branches à supprimer par Nico : `essai-dorade-saison`, `essais-dorade-saison`. Suite : grille de mer, coloris, pénalité > 24 °C, lune ; bonus d'octobre sans effet ; lissage couleur de l'eau.
- 20 nov. 22 h 40 : **bonus d'octobre sans effet** analysé (simulation Node, conditions inventées, rien codé). Options : A = lever le plafond de la saison (graus et embouchure à 100 par beau temps) ; B = retirer octobre de `GRAU_AUTUMN` (aucune note ne change) ; F = base d'octobre 0,80 pour tous + ×1,25 sans plafond (graus inchangés, roche/digue/plages −20 % en oct., 0,80 [P]). Alertes non concernées (`notif/alertes.js` n'utilise pas la note). Recommandé : B, F à trancher avec le carnet. **22 h 44, Nico : A écartée** (« 100 sous-entend du poisson à coup sûr, trop optimiste ») ; deux postes à égalité ne le gênent pas. B ou F pas encore choisi. **Nouvelle question de Nico : la note maximale est trop optimiste → chercher d'autres paramètres pour l'affiner et descendre vers un score plus réaliste.**
- 20 nov. 22 h 50 : recherche de sources lancée en tâche planifiée pour la nuit (lune, pénalité > 24 °C, grille de mer, coloris et couleur de l'eau, Fig. S13 de Thambithurai, sens de la note) → résultats attendus dans `chantiers/2-recherche-nuit.md` sur cette branche, rien dans `js/`.
