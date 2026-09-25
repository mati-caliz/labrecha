#!/bin/bash

# Poda la tabla error_events desde el cron del host.
# POST /errors es escritura anónima: cada fingerprint nuevo es una fila y nada la borra.
# Se van los vencidos (ERROR_RETENTION_DAYS, default 90) y lo que exceda el tope
# (ERROR_MAX_ROWS, default 5000), conservando siempre los más recientes.

set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.prod.yml"

started_at="$(date -u +%FT%TZ)"
echo "[${started_at}] prune-errors"
docker compose -f "${COMPOSE_FILE}" --profile scraper run --rm -T scraper prune-errors
