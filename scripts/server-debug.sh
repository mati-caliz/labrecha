#!/bin/bash

# Debugging del servidor en producción.
# Uso: ./scripts/server-debug.sh

cd "$(dirname "$0")/.." || exit 1
set -o pipefail

echo "🔧 Debugging del Servidor de La Brecha"
echo "═══════════════════════════════════════════════════════════"

echo ""
echo "1️⃣  Estado de Contenedores:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "2️⃣  Logs de la API (últimas 200 líneas):"
docker compose -f docker-compose.prod.yml logs --tail=200 api-py

echo ""
echo "3️⃣  Errores y Excepciones:"
docker compose -f docker-compose.prod.yml logs api-py 2>/dev/null \
  | grep -i "error\|exception\|failed\|traceback" | tail -30

echo ""
echo "4️⃣  Puertos en Uso:"
sudo netstat -tlnp | grep -E ":(8000|3000|5432)" || echo "netstat no disponible"

echo ""
echo "5️⃣  Variables de Entorno de la API:"
docker compose -f docker-compose.prod.yml exec -T api-py env \
  | grep -E "DATABASE_URL|CORS_" || echo "No se pudo obtener variables de entorno"

echo ""
echo "6️⃣  Conexión a PostgreSQL:"
docker compose -f docker-compose.prod.yml exec -T postgres pg_isready || echo "PostgreSQL no está respondiendo"

echo ""
echo "7️⃣  Espacio en Disco:"
df -h | grep -E "Filesystem|/$"

echo ""
echo "8️⃣  Health Check de la API:"
if docker compose -f docker-compose.prod.yml exec -T api-py \
    python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" >/dev/null 2>&1; then
  echo "✅ OK"
else
  echo "❌ FAIL"
fi

echo ""
echo "9️⃣  Imágenes Docker:"
docker images | grep -i labrecha || true

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "💡 Tips: reiniciar → ./scripts/server-restart.sh · logs → ./scripts/server-logs.sh api-py 100"
