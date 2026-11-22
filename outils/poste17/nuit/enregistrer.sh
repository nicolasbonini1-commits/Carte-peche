#!/bin/bash
# Ajoute /tmp/sortie dans essais-poste17/$D (branche mise à jour, jamais réécrite). Besoin de : D, GH_REPO, GH_TOK, GITHUB_SHA.
cd /tmp && rm -rf d && mkdir d && cd d && git init -q
git config user.name "poste17-bot"; git config user.email "poste17@users.noreply.github.com"
for essai in 1 2 3 4 5; do
  git fetch -q --depth=1 "https://github.com/$GH_REPO.git" essais-poste17 && git checkout -q -B essais-poste17 FETCH_HEAD
  mkdir -p "$D" && cp -r /tmp/sortie/. "$D"/
  git add -A && git commit -qm "poste17-nuit $D (commit ${GITHUB_SHA::7})" || { echo "rien de neuf"; exit 0; }
  git push -q "https://x-access-token:$GH_TOK@github.com/$GH_REPO.git" essais-poste17 && { echo "poussé dans essais-poste17/$D"; exit 0; }
  sleep 10
done
exit 1
