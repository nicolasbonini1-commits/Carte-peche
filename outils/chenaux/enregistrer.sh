#!/bin/bash
# Ajoute le contenu de $1 dans le dossier $2 de la branche essais-chenaux-donnees (plusieurs tâches en parallèle : réessaie).
set -u; SRC=$1; SUB=$2; TOK=$3; REPO=$4
URL="https://x-access-token:${TOK}@github.com/${REPO}.git"
for i in 1 2 3 4 5 6 7 8; do
  rm -rf /tmp/depot && mkdir /tmp/depot && cd /tmp/depot && git init -q && git config user.name "essai-bot" && git config user.email "essai@users.noreply.github.com"
  if git fetch -q --depth 1 "$URL" essais-chenaux-donnees 2>/dev/null; then git checkout -q -b essais-chenaux-donnees FETCH_HEAD; else git checkout -q -b essais-chenaux-donnees; fi
  mkdir -p "$SUB" && cp -r "$SRC"/. "$SUB"/ && git add -A && (git commit -qm "$SUB $(date '+%d/%m %H:%M')" || exit 0)
  git push -q "$URL" essais-chenaux-donnees && exit 0
  sleep $((RANDOM % 20 + 5))
done
exit 1
