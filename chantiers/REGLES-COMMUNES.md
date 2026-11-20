# Règles communes aux 3 chantiers (décidées par Nico le 20 nov. 2026, 18 h 44)

## Preuves (s'appliquent à tout le modèle, aux conseils et au guide Notion)
- Toute règle de l'appli ou tout conseil doit être **sourcé**. Ordre de valeur : [M] mesuré · [S] étude, source officielle ou publication vérifiée (lien + passage relu) · [T] terrain : carnet de Nico, relevés, témoignage d'un pêcheur local nommé dans `chantiers/3` · [N] dire de Nico, **en dernier recours seulement**, s'il n'existe aucune preuve tangible · [P] règle de pratique non sourcée : à remplacer, ou à garder marquée « à vérifier ».
- **Le guide Notion « Loup au leurre du bord » a été fait avec la version gratuite : ce n'est pas une référence.** Chaque affirmation utilisée doit être revérifiée à sa source (lien ouvert et relu), même si ça coûte des tokens.
- Un écart de 2-3 points de note entre postes n'est pas un signal tant que la grille est [P] : le dire.

## Travail en parallèle (3 conversations sur le même dépôt)
- Une branche par chantier : `chantier-1-postes`, `chantier-2-regles`, `chantier-3-terrain`. Chaque conversation ne modifie que les fichiers listés dans sa fiche ; pour un autre fichier, le dire à Nico d'abord.
- `git fetch` juste avant chaque push. **Une seule fusion sur `main` à la fois**, avec l'accord de Nico ; avant de fusionner : rebase sur `main`, relancer le test, prendre le **prochain numéro de cache libre** dans `sw.js` (v15 réservé à webcams + actions v5).
- Mettre à jour **sa propre fiche** (`chantiers/N-….md`, section « État ») à chaque étape ; REPRISE.md seulement au moment d'une fusion sur `main`, en une ligne.
- Dépôt **public** : aucun nom de personne, aucun spot secret, aucune clé.
