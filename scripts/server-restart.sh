#!/bin/bash

# Reinicia los servicios en producción.
# Uso: ./scripts/server-restart.sh

set -e

echo "🔄 Reiniciando La Brecha..."

cd "$(dirname "$0")/.."

echo "⏹️  Deteniendo contenedores..."
docker compose -f docker-compose.prod.yml down

echo "🧹 Limpiando imágenes antiguas..."
docker image prune -f

echo "🏗️  Reconstruyendo imágenes..."
docker compose -f docker-compose.prod.yml build --no-cache api-py web

echo "🚀 Levantando servicios..."
docker compose -f docker-compose.prod.yml up -d

echo "⏳ Esperando a que la API esté lista..."
sleep 10

max_attempts=30
attempt=0
while [[ "${attempt}" -lt "${max_attempts}" ]]; do
  if docker compose -f docker-compose.prod.yml exec -T api-py \
      python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" >/dev/null 2>&1; then
    echo "✅ API funcionando correctamente!"
    docker compose -f docker-compose.prod.yml logs --tail=50 api-py
    exit 0
  fi
  attempt=$((attempt + 1))
  echo "⏳ Intento ${attempt}/${max_attempts}..."
  sleep 2
done

echo "❌ La API no respondió después de ${max_attempts} intentos"
docker compose -f docker-compose.prod.yml logs --tail=100 api-py
exit 1
