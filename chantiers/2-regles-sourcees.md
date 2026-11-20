# Chantier 2 — Règles sourcées : leurres, mer, saison, lune, couleur de l'eau

Phrase de reprise : « reprise pêche chantier 2 : chantiers/2-regles-sourcees.md ». Lire aussi `chantiers/REGLES-COMMUNES.md`, REPRISE.md, LECONS.md (maison3d), skill coach-peche.
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

## État
- 20 nov. 18 h 45 : fiche créée, rien commencé.
