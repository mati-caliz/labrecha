#!/bin/bash

# Corre La Brecha en modo desarrollo local con hot-reload:
#   PostgreSQL en Docker + FastAPI (uvicorn) + frontend (Next) locales.
# Uso: ./scripts/run-local.sh

set -e
set -o pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="${PROJECT_ROOT}/api-py"
WEB_DIR="${PROJECT_ROOT}/web"

echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}[La Brecha]${NC} Desarrollo local (hot-reload)"
echo -e "${BLUE}================================${NC}"

if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}[ERROR]${NC} Docker no está corriendo."
    exit 1
fi

echo -e "${GREEN}[1/4]${NC} Levantando PostgreSQL..."
cd "${PROJECT_ROOT}" || exit 1
docker compose up -d postgres > /dev/null 2>&1
sleep 3

echo -e "${GREEN}[2/4]${NC} Preparando la API (FastAPI)..."
cd "${API_DIR}" || exit 1
if [[ ! -d ".venv" ]]; then
    echo -e "${YELLOW}[INFO]${NC} Creando venv e instalando dependencias (primera vez)..."
    python3 -m venv .venv
    ./.venv/bin/pip install -q -e .
fi

echo -e "${GREEN}[3/4]${NC} Preparando el frontend..."
cd "${WEB_DIR}" || exit 1
if [[ ! -f ".env.local" ]] && [[ -f ".env.example" ]]; then
    cp ".env.example" ".env.local"
fi
if [[ ! -d "node_modules" ]]; then
    echo -e "${YELLOW}[INFO]${NC} Instalando dependencias del frontend..."
    pnpm install
fi

echo -e "${GREEN}[4/4]${NC} Iniciando servicios..."
echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}Frontend:${NC} http://localhost:3000"
echo -e "${GREEN}API:${NC}      http://localhost:8000/docs"
echo -e "${BLUE}================================${NC}"
echo -e "${YELLOW}[INFO]${NC} Ctrl+C para detener todo."
echo ""

cleanup() {
    echo ""
    echo -e "${YELLOW}[INFO]${NC} Deteniendo servicios..."
    local job_pids_output
    local -a job_pids
    job_pids_output="$(jobs -p)"
    mapfile -t job_pids <<< "${job_pids_output}"
    kill "${job_pids[@]}" 2>/dev/null || true
    wait 2>/dev/null || true
    echo -e "${GREEN}[✓]${NC} Servicios detenidos"
    exit 0
}
trap cleanup SIGINT SIGTERM

cd "${API_DIR}" || exit 1
./.venv/bin/uvicorn labrecha_api.main:app --reload --port 8000 2>&1 | sed "s/^/[API] /" &

cd "${WEB_DIR}" || exit 1
LABRECHA_API_INTERNAL_URL=http://localhost:8000 pnpm run dev 2>&1 | sed "s/^/[WEB] /" &

wait
