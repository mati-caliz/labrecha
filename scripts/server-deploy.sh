#!/bin/bash

# Script para deploy rápido en producción
# Uso: ./scripts/server-deploy.sh

set -e

cd "$(dirname "$0")/.."

echo "🚀 Deploy de La Brecha a Producción"
echo "═══════════════════════════════════════════════════════════"

# Verificar que estamos en la rama correcta
CURRENT_BRANCH=$(git branch --show-current)
echo "📌 Rama actual: ${CURRENT_BRANCH}"

# Pull de cambios
echo ""
echo "⬇️  Bajando últimos cambios del repositorio..."
git pull origin ${CURRENT_BRANCH:+"${CURRENT_BRANCH}"}

# Detener servicios
echo ""
echo "⏹️  Deteniendo servicios..."
docker compose -f docker-compose.prod.yml down

# Rebuild
echo ""
echo "🏗️  Reconstruyendo imágenes..."
docker compose -f docker-compose.prod.yml build

# Levantar servicios
echo ""
echo "🚀 Levantando servicios..."
docker compose -f docker-compose.prod.yml up -d

# Esperar y verificar
echo ""
echo "⏳ Esperando a que los servicios estén listos..."
sleep 15

# Health check
echo ""
echo "🏥 Verificando health..."

max_attempts=20
attempt=0
while [[ "${attempt}" -lt "${max_attempts}" ]]; do
  if docker compose -f docker-compose.prod.yml exec -T api-py \
      python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" >/dev/null 2>&1; then
    echo "✅ API funcionando correctamente!"
    break
  fi
  attempt=$((attempt + 1))
  echo "⏳ Intento ${attempt}/${max_attempts}..."
  sleep 3
done

if [[ "${attempt}" -eq "${max_attempts}" ]]; then
  echo "❌ La API no respondió. Ejecutá ./scripts/server-debug.sh para más información"
  exit 1
fi

# Mostrar estado final
echo ""
echo "📊 Estado Final:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Deploy completado exitosamente!"
echo ""
echo "🔗 Sitio: https://labrecha.ar"
echo ""
echo "📋 Para ver logs: docker compose -f docker-compose.prod.yml logs -f api-py"
