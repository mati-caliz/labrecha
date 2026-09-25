#!/bin/bash

# Ver logs del servidor en producción.
# Uso: ./scripts/server-logs.sh [servicio] [líneas]
#   ./scripts/server-logs.sh api-py 100
#   ./scripts/server-logs.sh web
#   ./scripts/server-logs.sh

SERVICE=${1:-api-py}
LINES=${2:-100}

cd "$(dirname "$0")/.." || exit 1

echo "📋 Mostrando últimas ${LINES} líneas de logs de ${SERVICE}..."
echo "─────────────────────────────────────────────────────────"

docker compose -f docker-compose.prod.yml logs --tail="${LINES}" --follow "${SERVICE}"
