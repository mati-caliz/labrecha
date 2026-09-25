#!/bin/bash

# Corre jobs del scraper de La Brecha desde el cron del host.
# Uso: scrape-cron.sh [job ...]   (sin args = "all")
# Cada job corre en un contenedor efímero (profile "scraper", restart:no).
# Idempotente: los conectores hacen upsert sobre el índice único.

set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.prod.yml"
jobs=("$@")
if [[ ${#jobs[@]} -eq 0 ]]; then
  jobs=("all")
fi

for job in "${jobs[@]}"; do
  started_at="$(date -u +%FT%TZ)"
  echo "[${started_at}] scrape run ${job}"
  docker compose -f "${COMPOSE_FILE}" --profile scraper run --rm -T scraper run "${job}"
done
