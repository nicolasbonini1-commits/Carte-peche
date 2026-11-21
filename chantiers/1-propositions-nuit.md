# Chantier 1 — propositions de la nuit du 20 au 21 nov. 2026

Travail fait en autonomie (accord de Nico le 20 nov. à 23 h 05 : pousser sur `chantier-1-postes`, nouvelle tâche d'essai, routeur piéton OSM, propositions dans `js/spots.js`).
**Rien n'est sur `main`.** Tout ce qui est marqué « PROPOSÉ » dans `js/spots.js` (branche `chantier-1-postes`) attend ton accord, poste par poste.
Cartes et photos : branche `essais-postes-donnees` (`vue_*.png` = photo aérienne Esri rapprochée, `carte_poste_N_sat.png`, `carte_poste_N_zoom.png`).

## 1. À regarder en premier (3 points importants)
1. **Poste 14 (Maguelone) : le point de l'appli est dans l'étang**, derrière le lido, à 470 m de la mer (photo `vue_p14.png`). Proposé : bord de l'eau devant le poste de secours du Pilou (43,50514 / 3,88363).
2. **Poste 12 (Lez) : le feu vert retenu le 20 nov. est à l'intérieur du port de plaisance**, au bout d'un môle (photo `vue_p12.png`, `vue_p12b.png`). Le Lez sort 250 m plus au nord. Proposé : tête de jetée rive gauche (feu vert « Palavas les Flots », 43,52598 / 3,93449), avec les 3 épis de la plage des Épis autour. Le môle d'en face (rive droite) est à 1,5 km à pied par le pont de l'Union : écarté.
3. **Poste 6 (Grau-du-Roi) : règlement du port.** Article 24 du règlement de police du port de pêche (arrêté du 17 déc. 2025, plan de mai 2026, site de la ville) : dans le périmètre du port (chenal, entre les môles), **une seule canne à coup** (9 m max., flotteur ≤ 6 g) ; pêche au plomb seulement sur les épis côté mer, interdite de 9 h à 20 h du 15 juin au 15 septembre. Le dépliant d'août 2025 disait « au bouchon (sans moulinet) et au leurre, monofil uniquement ». **Le leurre au moulinet avec ta tresse ne semble donc pas autorisé sur les jetées du chenal.** Je n'ai pas pu lire l'arrêté complet (PDF scanné) : à confirmer à la capitainerie avant d'y pêcher au leurre. Le texte « attention » du poste 6 est mis à jour (proposé).

## 2. Poste par poste

| Poste | Point principal proposé | Écart avec l'appli | « Autour » (à pied) | Source |
|---|---|---|---|---|
| 1 Petit Rhône | inchangé (validé le 20 nov.) | — | 3 points rive est, confirmés par la nouvelle méthode (470-790 m) | OSM |
| 2 Saintes-Maries | inchangé (validé) | — | 3 points confirmés (690-980 m par le bord) | OSM, SYMADREM |
| 3 Rivage Espiguette | **2e des 11 épis de l'Espiguette est** (43,47247 / 4,16500) ; nom proposé « Épis de l'Espiguette est » | ancien point indicatif à 7 km | 4e, 7e et 11e épi (410 m à 1,25 km par la plage) | OSM, EMODnet 4 m à 100-150 m |
| 4 Espiguette | inchangé (validé) | — | 2 points de plage confirmés (≈ 1 km) | OSM |
| 5 Digue de l'Espiguette | inchangé (validé) | — | 2 épis confirmés (1,1 et 1,4 km par la digue et la plage) | OSM |
| 6 Grau-du-Roi | feu vert, jetée rive gauche (4 m de l'ancien point) | 4 m | 3 épis de la plage rive gauche (230 m, 630 m, 1 km) | OSM + photo |
| 7 Boucanet | inchangé (validé) | — | 3 épis confirmés (650 m à 1,1 km) | OSM |
| 8 Passe du Ponant | **bout de la jetée ouest du grau des Abîmes** (43,55286 / 4,09911) | ancien point dans la pinède, 525 m | brise-lames du Point Zéro (700 m) ; rive est du grau par le pont des Abîmes (1,3 km, à garder ou non) | OSM, Bonnefille 1989, Ifremer 2009 |
| 9 La Grande-Motte | plage face au brise-lames « paysager » | 30 m | feu vert de la jetée est du port (750 m) ; 2e brise-lames (350 m) | OSM, Bonnefille 1989, Figaro Nautisme |
| 10 Travers | bord de l'eau | 42 m | brise-lames côté Carnon (750 m) ; plage côté La Grande-Motte (700 m) | OSM |
| 11 Carnon | inchangé (feu rouge) | 1 m | épi 34 et épi suivant, plage ouest (870-960 m) ; brise-lames est écartés (entrée du port) | OSM + photo |
| 12 Lez | **tête de jetée rive gauche** (voir § 1) | 255 m | 3 épis de la plage des Épis (330-760 m) | OSM + photo |
| 13 Prévost | **bout de la jetée ouest du grau** (43,51802 / 3,91524) | ancien point au poste de secours, 425 m | jetée est et brise-lames est par le pont de l'avenue de l'Évêché-de-Maguelone (≈ 0,5-0,7 km) ; plage vers Maguelone (1 km) | OSM + photo |
| 14 Maguelone | **plage du Pilou** (voir § 1) | 470 m | plage ± 800 m | OSM + photo |
| 15 Aresquiers | bord de l'eau | 39 m | 1er épi vers Frontignan (790 m) ; plage vers Maguelone (700 m) | OSM ; fonds rocheux visibles sur la photo à ≈ 150 m |
| 16 Frontignan | inchangé (feu rouge, digue ouest) | 4 m | 2 épis de la plage ouest (280-350 m) ; digue et plage est écartées (chenal) | OSM, Figaro Nautisme, FAO |

`seaward` (direction de la mer, change le calcul vent de terre / de mer) : proposé **poste 3 : 175 → 210**, **poste 8 : 170 → 185**, **poste 9 : 170 → 180**, **poste 15 : 140 → 125** (côte OSM lissée sur ± 300 m) ; les autres inchangés. Poste 3 : zone météo E → C (le nouveau point est plus près de l'Espiguette que de la Petite Camargue).

## 3. « Joignable à pied » : la méthode
- 1er essai (routeur piéton OSM seul) : **faux** sur les plages et les épis (le routeur ne connaît pas la marche sur le sable, il accroche parfois le chemin d'en face) — deux épis voisins du Boucanet donnés « à écarter ».
- Méthode retenue (`outils/postes/cote.js`) : on suit le trait de côte OSM (on peut couper une jetée par le dessus, jamais un chenal) ; obstacle = cours d'eau ou canal OSM entre les deux points (embouchure prolongée vers la mer), côte qui fait le tour d'un port, ou deux têtes de jetée face à face (feu rouge / feu vert). S'il y a un obstacle, le routeur piéton cherche le pont.
- Seuils proposés [P] : ≤ 1 500 m (≈ 20 min) ; « joignable en contournant » si un pont le permet dans cette distance (à toi de dire si c'est encore la même zone : poste 8, rive est ; poste 13, jetée est).
- Contrôle sur 9 cas connus (`outils/postes/temoins.js`) : **9 sur 9 conformes** (dont la pointe de l'Espiguette écartée par toi et l'ancien point rive ouest du poste 1). Mais la méthode a d'abord raté le chenal de Frontignan (OSM ne le dessine pas) : **chaque point a aussi été regardé sur la photo aérienne.**

## 4. Essai de l'affichage « Autour » (Chrome sans écran, vraies réponses)
Version d'essai = `main` (v17) + chantier 1, cache **v18** (prochain numéro libre : `main` et chantier 2 sont en v17, chantier 3 en v14).
Résultat du 21 nov. à 1 h 15 (branche `essais-autour`, `resultat.json` + captures `fiche_*.png`, `carte_*.png`) :
- les 16 fiches s'ouvrent sans erreur JavaScript ; pour chaque poste, la ligne « Autour » et le nombre de points gris sur la carte = ceux de `js/spots.js` ; points retirés à la fermeture de la fiche ;
- sans réseau : 16 postes affichés, bandeau « Pas de réseau », fiche du poste 7 avec ses 3 points ; retour du réseau : bandeau parti en 4 s, fiche du poste 4 avec ses 2 points ; cache `carte-peche-v18` en place.
- Au 1er passage (0 h 28), le bandeau était resté 44 s : une requête à la mer d'Open-Meteo n'avait pas répondu (délai du navigateur), la 2e a marché. Pas de correction proposée (cas rare), à surveiller.
- Notes de demain matin, essai / `main` : poste 3 **« pas assez de temps sur place » (185 min de route : l'ancien point n'était pas joignable en voiture) → 64** (86 min) ; poste 4 : 55 → 64 et poste 5 : 79 → 74 (recalages du 20 nov.) ; les autres identiques à ± 1 min de route.

## 5. Ce qui n'a pas été vérifié
- Droit de pêche sur chaque digue et épi (ports de Carnon, Palavas, La Grande-Motte, Frontignan) ; accès réel au 2e épi du poste 6 et aux brise-lames détachés (marée basse, enrochements).
- Profondeur EMODnet illisible au bout des jetées (maille de 115 m : « 0 » ou valeur de terre).
- La « digue cassée » du poste 9 n'est située que par un blog (niveau [V]).
- **Couleur de l'eau** : les coefficients de `M.TURB` sont calés poste par poste sur des points à 300 m du bord de l'ancienne position ; les postes 3, 8 et 14 n'avaient pas de calage à 300 m (trop peu de valeurs, ou point dans les terres). Avec les nouvelles positions, un nouveau calage satellite serait possible (chantier 2) ; en attendant, l'estimation y reste peu sûre, surtout au poste 3 (déplacé de 7 km).
- Les notes des postes vont changer un peu (positions, `seaward`, zone du poste 3) : comparaison essai / `main` dans le résultat de l'essai.
