#!/bin/bash

set -e

echo "🚀 Iniciando deploy de La Brecha..."

if [[ ! -f .env ]]; then
    echo "❌ Error: Archivo .env no encontrado"
    echo "Copia .env.production.example a .env y configura las variables"
    exit 1
fi

# Cargar variables del archivo .env
set -a
source .env
set +a

# Detectar si usa docker-compose o docker compose
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo "❌ Error: Docker Compose no está instalado"
    echo "Instala Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "📦 Construyendo imágenes..."
${DOCKER_COMPOSE} -f docker-compose.prod.yml build --no-cache

echo "🛑 Deteniendo contenedores anteriores..."
${DOCKER_COMPOSE} -f docker-compose.prod.yml down

echo "🚀 Levantando servicios..."
${DOCKER_COMPOSE} -f docker-compose.prod.yml up -d

echo "⏳ Esperando que los servicios estén listos..."
sleep 10

echo "✅ Verificando estado de los servicios..."
${DOCKER_COMPOSE} -f docker-compose.prod.yml ps

echo ""
echo "✅ Deploy completado!"
echo ""
echo "📊 Servicios: postgres + api-py + web (ver 'docker compose -f docker-compose.prod.yml ps')"
echo ""
echo "📝 Ver logs:"
echo "  ${DOCKER_COMPOSE} -f docker-compose.prod.yml logs -f"
