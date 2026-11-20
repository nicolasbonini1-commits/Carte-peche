# Chantier 2 — Recherche de nuit (20-21 nov. 2026)

Tâche planifiée lancée le 20 nov. vers 22 h 50, faite pendant la nuit (fin vers 23 h 40). **Recherche seulement : rien n'a été changé dans l'appli** (`js/`, `sw.js`, `index.html`, `css/` non touchés).

**Lecture choisie (Nico dormait, pas de question possible)** : j'ai cherché les 6 sujets dans l'ordre demandé, en lançant une recherche par sujet en parallèle, puis j'ai rassemblé et vérifié la cohérence. Les « changements proposés » ci-dessous sont des **propositions** à discuter, pas des décisions. Les chiffres de l'appli cités sont ceux de `js/model.js` sur la branche `chantier-2-regles` (commit 6def4cd).

## Résumé (à lire en premier)
1. **Lune** : aucune étude trouvée sur la lune et le bar (ni sauvage, ni élevage, ni carnets de pêcheurs). « Aube moins bonne à la pleine lune » : **aucun appui**. → **garder [P]**, ne rien ajouter à l'aube.
2. **Loup > 24 °C** : [S] élevage seulement — l'appétit du bar est **maximal vers 27-28 °C**, baisse nette seulement vers 30-33 °C. La pénalité ×0,7 dès 24 °C est **contredite**. → proposer : neutre jusqu'à 28 °C, puis baisse [P] au-delà.
3. **État de la mer** : aucune étude ne chiffre houle et captures du bord (bar ou dorade). Une seule relation chiffrée, en bateau pro au Royaume-Uni : succès qui **baisse** quand les vagues montent. → **garder [P]** ; le bonus « mer qui retombe » ×1,15 n'a aucun appui.
4. **Couleur de l'eau / coloris** : [S] le bar voit 3 couleurs (pics 389, 512 et 611 nm, poissons de l'écloserie de Balaruc). Rien sur turbidité et attaque. Bars et dorades se nourrissent dans des lagunes troubles. → `WATER_*` et `colorFor` restent **[P]** ; la pénalité dorade « teintée » ×0,7 paraît forte.
5. **Fig. S13 dorade** : **pas pu la lire** (pages bloquées). Le texte confirme oct.-nov. en général ; au Prévost, les départs sont **concentrés début-mi-octobre** (6 oct. ± 6 j). → le bonus de **novembre** (le seul qui agit) est le moins appuyé pour Palavas.
6. **Sens de la note** : le 100 du loup n'est atteint **que grâce à deux bonus sans source** (mer qui retombe ×1,15 et eau piquée ×1,05). Données réelles : ~0,5 bar/h chez des pêcheurs irlandais assidus [S], ~0,06-0,09 bar/h pour un pêcheur du bord moyen au Portugal [S]. → 3 pistes plus bas (A : enlever les bonus non sourcés ; B : afficher un « indice relatif » ; C : traduire en « chance d'au moins un bar »).

---

## 1. Lune et loup

**Verdict : rien trouvé. Garder [P].**

Ce qui a été cherché : lune + Dicentrarchus labrax (activité, alimentation, déplacements, captures), télémétrie Irlande/Royaume-Uni/Méditerranée, rythmes d'alimentation en élevage, enquêtes de pêche de loisir.

Sources lues (aucune ne teste la lune sur le bar) :
- **Chen et al. 2023**, Front. Mar. Sci., doi 10.3389/fmars.2023.1168953 — https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2023.1168953/full — [S]. 22 bars en cage, baie de Souda (Crète, Méditerranée), mai-juin 2021, télémétrie. Pic d'activité **6 h - 10 h** ; positions près de la surface le soir. La lune n'est pas analysée. Utile seulement pour dire : l'aube est bien un moment actif (élevage en cage).
- **Sánchez-Vázquez, Madrid & Zamora 1995**, J. Biol. Rhythms 10:256-266 — [S, résumé seul]. Élevage : le bar peut manger de jour ou de nuit ; le rythme suit la lumière jour/nuit. Pas de lune.
- **Rubio et al. 2004**, Aquaculture 233:393-403 — https://agris.fao.org/search/fr/records/65deb1c36eef00c2cea0f54c — [S, résumé seul]. Bars qui se nourrissent eux-mêmes : la part de nuit change avec la saison (23 % en sept., 47 % en févr., en cage). Pas de lune.
- **Doyle et al. 2017**, Sci. Rep. 7:45841 — https://link.springer.com/content/pdf/10.1038/srep45841.pdf — [S]. Port de Cork (Irlande). Pas d'analyse lune ni jour/nuit.
- **O'Neill et al. (~2018)**, marques satellites en mer Celtique — https://core.ac.uk/download/286098369.pdf — [S]. La lumière sert à localiser, pas d'analyse lunaire.
- Autres espèces, pour mémoire seulement : **Milardi et al. 2018** (ECSS, lagune du delta du Pô) : effets de la lune faibles et différents selon l'espèce (flet +, gobie −), plus faibles que les autres facteurs — https://iris.unife.it/retrieve/e309ade5-2306-3969-e053-3a05fe0a2c94/Lanzoni%20Mattia%2032%3fc%20elaborato%20finale.pdf (p. 81-91) [S]. Le bar n'y est pas analysé. Sars juvéniles (Portugal) : pas de différence pleine / nouvelle lune [S].
- Déjà dans la fiche : la revue Andrzejaczek 2024 ne couvre pas le bar.

Pour l'appli : la règle de nuit (0,85 sombre / 0,75 claire) reste [P]. **Ne pas ajouter de baisse à l'aube** de pleine lune : le guide Notion n'est appuyé par rien de trouvé. Si Nico veut le tester : noter la phase de lune dans le carnet (l'appli la calcule déjà avec `M.moon`) et comparer après une dizaine de sorties.

## 2. Loup en eau chaude (> 24 °C)

**Verdict : [S] mais élevage et juvéniles uniquement. La pénalité dès 24 °C est contredite ; aucune donnée sur le loup sauvage entre 24 et 28 °C.**

- **Person-Le Ruyet, Mahé, Le Bayon & Le Delliou 2004**, Aquaculture 237:269-280 — https://archimer.ifremer.fr/doc/00000/626/301.pdf — [S]. Juvéniles de souche méditerranéenne, 13 à 29 °C pendant 84 jours (Ifremer Brest). Prise de nourriture **la plus forte entre 25 et 29 °C**, maximum estimé **27,5 °C** ; croissance optimale vers 26 °C, à peine réduite à 29 °C (−6 % de poids par rapport à 25 °C). Limites mortelles citées : 30-32 °C (d'après une autre source, non lue).
- **Stavrakidis-Zachou et al. 2022**, PLOS ONE — https://imbbc.hcmr.gr/wp-content/uploads/2022/09/2022-Stavrakidis-Zachou-PLOS-ONE-64.pdf — [S]. Juvéniles de cages en Crète, 3 mois à 24, 28 et 33 °C. Nourriture : maximale à **28 °C** ; à **33 °C** l'appétit chute de moitié, la croissance s'arrête, ~50 % de mortalité. Marge d'effort (capacité aérobie) : 341 / 327 / 232 mg O₂/kg/h à 24 / 28 / 33 °C.
- **Nati, Rodde … McKenzie 2025**, Front. Fish Sci. 3, doi 10.3389/frish.2025.1542342 — https://www.frontiersin.org/articles/10.3389/frish.2025.1542342/full — [S]. Poissons d'écloserie de 3 souches. Le bar ne tient plus une nage prolongée vers **30-33 °C** (souche Méditerranée ouest : 33,2 °C). En eau chaude, il supporte moins le manque d'oxygène (seuil ~25 % de saturation à 18 °C, ~30-34 % à 24 °C).
- **Dülger et al. 2012**, J. Thermal Biol. 37:79-82 — [S, résumé seul]. Juvéniles de Turquie : température critique 33-36 °C.
- **Mignucci et al. 2023** (étang du Prévost, déjà dans la fiche) — https://archimer.ifremer.fr/doc/00849/96070/104122.pdf — [S]. Le loup sauvage reste ~99 % de sa saison d'alimentation dans la lagune et en part vers le 1er nov. ± 15 j ; **aucune fuite d'été vers la mer** rapportée dans le texte lu.
- **Fiche FAO bar européen** — https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/fr/fr_europeanseabass.htm — [S] : espèce supportant **5-28 °C**.
- **Hamon et al. 2003**, Ifremer, « Les malaïgues de l'étang de Thau » — https://archimer.ifremer.fr/doc/00038/14951/ — [S, résumé seul]. 9 crises de manque d'oxygène 1969-2000, toutes en été. Rien sur les poissons. C'est un **événement**, pas une température.
- Rien trouvé : température préférée du bar sauvage chiffrée (projet Ifremer THERMOPREF sans résultat publié).

Pour l'appli (proposition, rien codé) : `> 24 → ×0,7` n'a pas d'appui. Proposition : **1,0 jusqu'à 28 °C** [S élevage] ; au-delà de 28 °C une baisse [P] (par ex. ×0,85 de 28 à 30 °C, ×0,6 au-dessus de 30 °C : ces paliers sont une extrapolation). Effet pratique faible : la mer du golfe du Lion dépasse rarement 28 °C au bord, et le loup est peu présent en été dans `M.SEASON` (0,30 en juillet). Limite : la température de l'appli est celle prévue par Open-Meteo pour la zone, pas mesurée au poste ni dans les étangs.

## 3. État de la mer

**Verdict : rien qui chiffre la relation houle → captures du bord, ni pour le bar ni pour la dorade. Garder [P].**

- **Watson, Muench, Hyder & Sibly 2022**, PLoS ONE 17(3):e0266170 — https://ueaeprints.uea.ac.uk/id/document/95650 — [S]. Pêche **professionnelle** de bar en bateau < 10 m, Royaume-Uni, 8 815 sorties 2014-2018. Moins de 25 % des bateaux sortent au-delà de 2 m de vagues (§ 3.1) ; le poids pris par sortie **baisse** quand les vagues montent (§ 3.2, effet donné en graphique seulement). Attention : bateau, Atlantique/Manche, et la difficulté de pêcher se mélange à l'effet sur le poisson. Ne dit rien de l'écume vue du bord.
- **Pita & Freire 2011**, Sci. Mar. 75(4) — https://scientiamarina.revistas.csic.es/index.php/scientiamarina/article/download/1298/1379/1357 — [S]. Bars suivis en Galice, site très exposé. Pas d'analyse avec la houle.
- **Doyle et al. 2017** (Cork) — [S]. Bars très fidèles à leur site (97 % des détections près du lâcher). Houle et tempêtes non testées.
- **Esposito et al. 2015**, Medit. Mar. Sci. 16(3) — https://ejournals.epublishing.ekt.gr/index.php/hcmr-med-mar-sc/article/download/12972/12498 — [S]. Zone de déferlement sableuse (nord de la Sicile) : quelques bars (14, ~19 cm), aucune dorade royale. Exposition aux vagues non mesurée.
- **Edwards et al. 2025**, ICES JMS — https://www.vliz.be/imisdocs/publications/ocrd/418049.pdf — [S]. Bars en mer du Nord et Manche : pas de variable météo.
- Mignucci 2023 et Thambithurai 2026 : houle non testée.

Pour l'appli : grilles `SEA_LOUP` / `SEA_DORADE`, seuils 0,3 / 0,8 / 1,8 m et bonus « mer qui retombe » restent [P]. Le bonus ×1,15 (loup) / ×1,10 (dorade) n'a **aucun appui** : piste de le ramener à 1,0-1,05 jusqu'à ce que le carnet le montre (voir aussi sujet 6). La seule donnée chiffrée (bateau pro) va plutôt contre « plus c'est agité, mieux c'est », mais elle ne se transpose pas au bord.

## 4. Couleur de l'eau et coloris des leurres

**Verdict : vision du bar [S] ; turbidité → alimentation : rien de chiffré. `WATER_LOUP`, `WATER_DORADE`, `M.colorFor` restent [P].**

- **Brill, Horodysky, Place, Larkin & Reimschuessel 2019**, PLoS ONE 14(6):e0214347 — https://core.ac.uk/download/235421494.pdf — [S]. Laboratoire (États-Unis), alevins venus de l'écloserie Les Poissons du Soleil (**Balaruc-les-Bains**, étang de Thau). Mesure électrique de la rétine de 300 à 700 nm (tableaux 4-5) : modèle à **3 types de cônes, pics 389 (proche UV), 512 (vert) et 611 nm (orange-rouge)** ; sensibilité maximale au-delà de 530 nm. Les auteurs évoquent, sans le tester, un avantage de contraste en eau trouble.
  - Pour `colorFor` : le bar voit bien le jaune-vert et l'orange. « Eau teintée → chartreuse » est **compatible** avec sa vision, pas démontré. « Blanc en eau teintée » relève du contraste de clarté, non étudié ici.
- **Mani-Ponset et al. 1993**, EAS Spec. Publ. 18 — https://www.vliz.be/imisdocs/publications/ocrd/120404.pdf — [S]. Structure de la rétine pendant la croissance ; pas de mesure de couleur.
- **Moraga, Wilson & Cooke 2015**, Fish. Res. 172:1-6 — https://pearl.plymouth.ac.uk/bitstream/10026.1/11441/1/1-s2.0-S0165783615001903-main.pdf — [S]. **Autre espèce** (black-bass, lac en Ontario) : 6 coloris, pas d'effet significatif sur le nombre de prises ; coloris vifs → poissons un peu plus grands. Indice que le coloris pèse peu, à ne pas transposer tel quel.
- **Mignucci et al. 2023** — [S]. Bars et dorades passent leur saison d'alimentation dans la lagune du Prévost, eau souvent trouble (résidence 99 % et 94 %). Indirect : ils mangent en eau chargée. La dorade « teintée » à ×0,7 paraît donc sévère, mais rien ne chiffre l'inverse.
- Rien trouvé : distance d'attaque ou taux d'attaque du bar / de la dorade selon la turbidité (NTU/FNU) ; règles de nuit « nuit sombre → clair, nuit claire → silhouette sombre » ; vision de la dorade (pas cherchée en détail).

Pour l'appli : garder les valeurs [P] en les marquant « guide non vérifié ». Ajout possible dans le texte affiché : « le bar voit le vert-jaune et l'orange [S] (Brill 2019) ». La proposition de lissage sur log(FNU) (en attente) n'est ni appuyée ni contredite par ces sources.

## 5. Fig. S13 de Thambithurai et al. 2026 (dorade, départs par étang)

**Verdict : Fig. S13 non lue (pages bloquées). Le texte confirme « oct.-nov. » en général ; pour le Prévost, une autre étude montre des départs serrés début-mi-octobre.**

- Le matériel supplémentaire existe : 3 fichiers, aussi sur figshare — https://doi.org/10.6084/m9.figshare.31239709 (cité p. 13, « Data availability »). Pages de l'éditeur, PMC (PMC12927243) et figshare : **bloquées pendant la nuit**. Le dépôt Lancaster n'a que le PDF principal. Données brutes : European Tracking Network.
- PDF principal — https://eprints.lancs.ac.uk/235647/1/40462_2025_Article_619.pdf — [S] :
  - Méthode (p. 5) : départ = dernière détection dans la lagune ; comptage par semaines, **septembre à novembre seulement** → un départ en décembre ne pouvait pas apparaître.
  - Résultats (p. 9) : sortie « generally between October and November », pic vers mi-octobre (Fig. S13) ; Berre dès septembre ; le moment exact varie selon la lagune, « with consistency among years ».
  - Aucun chiffre par lagune ni par année dans le texte ; aucun test statistique de la date de départ.
  - Petite contradiction : la Discussion (p. 12) parle d'écarts entre années liés à la température, et d'un pic de **présence sur les frayères** mi-novembre (Fig. 5) — à ne pas confondre avec le pic de départ.
- **Mignucci et al. 2023** (§ 3.3.1) — [S] : Prévost, 72 dorades 2017-2021, départ **6 oct. ± 6 j**, aucun en septembre ni décembre, retour ~31 mars.
- Thau : **rien trouvé** de précis (septembre ou décembre ?).

Pour l'appli : `GRAU_AUTUMN` = oct.-nov. reste cohérent avec le texte. Mais : en octobre le bonus est sans effet (plafond) et **le seul bonus qui agit est celui de novembre (×1,20), alors qu'au Prévost les départs sont finis vers le 20 octobre**. Piste à discuter : bonus surtout en octobre (avec l'option F de la fiche) et novembre réduit, au moins pour le grau de Palavas. À trancher après lecture de la Fig. S13 (à ouvrir à la main sur figshare : 2 minutes sur téléphone).

## 6. Sens de la note (100 = « poisson à coup sûr » ?)

### Ce que montre le code
Le maximum du loup : embouchure 0,95 × saison 1,0 (nov.) × mer 1,0 × lumière 1,0 × vent 1,0 × eau 1,0 × couleur de l'eau 1,05 = 0,9975 → **100**. Mais la mer n'atteint 1,0 sur une embouchure (0,90 au mieux) **que grâce au bonus « mer qui retombe » ×1,15**, et le 1,05 vient de « eau piquée ». Sans ces deux bonus non sourcés : 0,95 × 0,90 = **86**. Dorade : maximum 95 (grau ou roche 0,95).

### Données réelles de pêche de loisir
- **IFI (Irlande), National Bass Programme 2018-2020** — https://www.fisheriesireland.ie/sites/default/files/2021-12/ifi-national-bass-programme-angler-data-report-2018-2020.pdf — [S] (§ 3, fig. 8) : carnets de pêcheurs assidus, surtout au leurre : **0,52 bar par heure** en moyenne (0,78 en 2020, bonne année) ; ~90 % relâchés. Utilisé comme **indice d'une année sur l'autre**, jamais comme probabilité.
- **Ferter et al. 2013**, ICES JMS 70:1319 — https://archimer.ifremer.fr/doc/00163/27436/25671.pdf — [S] (tableau 1) : France hors Méditerranée, environ la moitié des bars relâchés. Les carnets Ifremer 2009-2010 donnent ~1 383 bars pour 1 190 sorties (≈ 1,2 bar par sortie, calcul non pondéré).
- **Pontes 2019**, mémoire, Univ. Algarve — https://core.ac.uk/download/362636283.pdf — [S] (tableaux 9-14) : pêche du bord au Portugal, **0,06 à 0,085 bar par heure** ; 25-42 % de sorties sans aucun poisson (toutes espèces).
- **Cefas, Catchwise (Radford et al. 2025)** — https://assets.publishing.service.gov.uk/media/6a5a19eb5ca06bf11ccb43d2/Catchwise_report_-_FOR_SUBMISSION_checked.pdf — [S] (tableaux 14-17) : Angleterre, 0,3 à 0,5 bar relâché par sortie selon la région ; sorties de 4-5 h.
- **FranceAgriMer 2018**, pêche de loisir — https://sextant.ifremer.fr/sextant_data/DCSMM_EVAL2024/SOURCES/FRANCEAGRIMER/859_franceagrimer_etude_peche_loisir_2018.pdf — [S] (p. 49-52) : 48 % des pêcheurs de bar en prennent moins de 5 par an.
- Aucun modèle trouvé qui explique les prises de bar par marée, houle, vent ou lune ; les études Catchwise et Catalogne testent surtout saison, zone et effort.

Calcul simple (loi de Poisson, mon calcul, pas une source) : à 0,52 bar/h, **3 h de pêche → 79 % de chances d'au moins un bar** ; à 0,075 bar/h (pêcheur moyen au Portugal) → **20 %**. Les vrais résultats sont plus irréguliers que Poisson (beaucoup de bredouilles), donc ces chances sont plutôt trop hautes.

### Pistes (rien codé)
**A. Enlever ou réduire les bonus sans source** (mer qui retombe ×1,15 → 1,0-1,05 ; eau piquée 1,05 → 1,0).
- Appui : sujets 3 et 4 (aucune source) ; règle commune « [P] à remplacer ».
- Effet : le loup plafonne vers 86-90 au lieu de 100 ; le 100 disparaît de lui-même sans toucher aux autres facteurs. Simple, cohérent avec le chantier.

**B. Afficher la note comme un « indice relatif »** : « 90 = parmi les meilleures conditions connues de l'appli », pas « 90 % de chances ». Éventuellement plafond affiché à 90 tant que la grille est [P] et que le carnet a moins de ~10 sorties.
- Appui : l'Irlande et le Royaume-Uni utilisent le taux de captures comme **indice**, pas comme probabilité (IFI, Cefas) ; règle commune « 2-3 points d'écart ne sont pas un signal ».
- Effet : surtout le texte (légende, fiche) ; aucun calcul changé, sauf si plafond.

**C. Traduire la note en « chance d'au moins un bar en 3 h »** : chance = 1 − exp(−λ × heures), avec λ = λmax × note/100 (λmax de départ ≈ 0,5 bar/h, pêcheur assidu [S, Irlande]), puis λmax recalé sur le carnet de Nico.
- Appui : seules données chiffrées trouvées (IFI 0,52 bar/h ; Portugal 0,06-0,09 bar/h).
- Effet : une note de 100 afficherait ~79 % sur 3 h, une note de 50 ~54 %. Plus parlant, mais **λmax est très incertain** : il change d'un facteur 6 entre l'Irlande et le Portugal, et rien n'existe pour le golfe du Lion. À faire seulement quand le carnet aura assez de sorties (la tâche `releves` n'a reçu aucun ticket à ce jour).

Facteurs absents du modèle qui feraient baisser la note (aucune source chiffrée trouvée pour eux) : fréquentation du poste / pression de pêche, chalutiers proches (déjà dans le carnet), durée de pêche. La marée est faible en Méditerranée.

Recommandation : **A + B** maintenant (cohérent avec « remplacer les [P] »), **C** plus tard avec le carnet.

---

## Autocritique
- **Non lu** : Fig. S13 et tout le matériel supplémentaire de Thambithurai 2026 (figshare, PMC, éditeur bloqués pendant la nuit) ; texte complet de Rocklin et al. 2014 (PMC) ; article Movement Ecology 2024 sur les migrations du bar au Royaume-Uni (texte complet bloqué) ; Pickett & Pawson 1994 (livre) ; une piste sur la température préférée (Ethology, iris.unive.it). Plusieurs sources seulement en **résumé** (Sánchez-Vázquez 1995, Rubio 2004, Dülger 2012, Hamon 2003) : marquées ainsi.
- **Méthode** : chaque sujet a été recherché par un agent séparé, puis rassemblé ; je n'ai pas rouvert moi-même chaque PDF. Les chiffres clés (27,5 °C, 28 °C, 389/512/611 nm, 0,52 bar/h, 6 oct. ± 6 j) sont à recontrôler en ouvrant le lien avant de coder une règle.
- **Limites des sources** : sujet 2 = juvéniles d'élevage, pas des loups sauvages ; sujet 3 = bateau pro en Atlantique ; sujet 6 = Irlande, Royaume-Uni, Portugal, rien pour le golfe du Lion ni pour la dorade à la calée. Aucun calcul de chance n'a de base locale.
- **Pas cherché** : vision de la dorade royale ; littérature générale « prédateurs et turbidité » ; noms d'auteurs Kennedy, de Pontual, Stamp, Walker pour la lune ; rapports IFI 2022-2024 ; « Mon Bar », FNPPSF.
- Aucune modification dans `js/`, `sw.js`, `index.html`, `css/` ; rien sur `main`, `donnees`, `releves` ; rien dans Notion.
