#!/bin/bash

# Levanta todo el stack de La Brecha con Docker Compose (postgres + api-py + web).
# Para desarrollo activo con hot-reload usá ./scripts/run-local.sh.

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_ROOT}" || exit 1

echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}[La Brecha]${NC} Levantando con Docker"
echo -e "${BLUE}================================${NC}"
echo -e "${YELLOW}⚠️  Sin hot-reload: hay que reconstruir tras cambios de código.${NC}"
echo ""

if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}[ERROR]${NC} Docker no está corriendo."
    exit 1
fi

echo -e "${YELLOW}[?]${NC} ¿Reconstruir sin cache? (s/N): "
read -r rebuild
echo ""

if [[ ${rebuild} =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}[INFO]${NC} Deteniendo y reconstruyendo sin cache..."
    docker compose down
    docker compose build --no-cache
else
    echo -e "${YELLOW}[INFO]${NC} Reconstruyendo imágenes..."
    docker compose build
fi

echo ""
echo -e "${GREEN}[INFO]${NC} Levantando servicios..."
docker compose up -d

echo ""
echo -e "${YELLOW}[INFO]${NC} Esperando a que estén listos..."
sleep 8

echo ""
docker compose ps
echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}Frontend:${NC}    http://localhost:3000"
echo -e "${GREEN}API:${NC}         http://localhost:8000/docs"
echo -e "${GREEN}PostgreSQL:${NC}  localhost:5432"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "${YELLOW}Comandos útiles:${NC}"
echo -e "  Ver logs:      docker compose logs -f [servicio]"
echo -e "  Detener:       docker compose down"
echo -e "  Scraper:       docker compose run --rm scraper run <job|all>"
echo ""
