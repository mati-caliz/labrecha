#!/bin/bash

# Estado de los servicios en producción.
# Uso: ./scripts/server-status.sh

cd "$(dirname "$0")/.." || exit 1
set -o pipefail

echo "🔍 Estado de los servicios de La Brecha"
echo "═══════════════════════════════════════════════════════════"

echo ""
echo "📦 Contenedores Docker:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "🏥 Health Check de la API:"
if docker compose -f docker-compose.prod.yml exec -T api-py \
    python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" >/dev/null 2>&1; then
  echo "✅ API respondiendo correctamente"
else
  echo "❌ La API NO está respondiendo"
  echo ""
  echo "📋 Últimas 50 líneas de logs:"
  docker compose -f docker-compose.prod.yml logs --tail=50 api-py
fi

echo ""
echo "💾 Uso de Recursos:"
mapfile -t container_ids < <(docker compose -f docker-compose.prod.yml ps -q || true)
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
  "${container_ids[@]}"

echo ""
echo "🚨 Últimos errores en logs (si hay):"
docker compose -f docker-compose.prod.yml logs --tail=200 api-py 2>/dev/null \
  | grep -i "error\|exception\|failed" | tail -10 || true
