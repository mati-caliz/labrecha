#!/bin/bash

# Levanta solo la infraestructura (PostgreSQL) para desarrollo local.
# La API (FastAPI) y el frontend se corren aparte con hot-reload.

set -e

echo "🚀 Iniciando infraestructura de La Brecha..."

if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker no está corriendo"
    exit 1
fi

echo "📦 Levantando PostgreSQL..."
docker compose up -d postgres

echo "⏳ Esperando a que la base de datos esté lista..."
sleep 3

echo ""
echo "✅ Infraestructura lista."
echo ""
echo "Para desarrollar:"
echo "  API (FastAPI):   cd api-py && uvicorn labrecha_api.main:app --reload --port 8000"
echo "  Frontend:        cd web && pnpm run dev"
echo "  Scraper:         docker compose run --rm scraper run <job|all>"
echo ""
echo "🌐 Frontend: http://localhost:3000   ·   🔧 API: http://localhost:8000/docs"
