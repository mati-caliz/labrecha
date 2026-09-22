# La Brecha

Observatorio público de métricas político-económicas de Argentina: reúne indicadores dispersos
(INDEC, BCRA, datos.gob.ar, consultoras, Congreso) en una sola fuente clara. Dos features
definitorias: **la brecha entre mediciones** (un mismo indicador según fuentes distintas) y las
**series anotadas con eventos políticos**. Solo lectura, sin login.

> Antes se llamaba **FinArg**: el stack Spring original se retiró por completo y el historial
> del pivot vive en el git del repo.

## Arquitectura

Monorepo de cuatro piezas; **PostgreSQL es el contrato** entre ellas:

```
shared/    paquete labrecha_db: los modelos SQLAlchemy y las migraciones Alembic. La única
           definición del esquema; el scraper y la API lo instalan y ninguno define tablas.
scraper/   Python — ingesta por fuente (un conector = un módulo), corrido por cron.
api-py/    FastAPI de solo lectura sobre Postgres + calculadoras. Sin estado, sin auth.
web/       Next.js (App Router) + React + TypeScript + Tailwind + Recharts.
```

El frontend consume la FastAPI a través de un proxy same-origin (`/api/data`) con caché en el server
de Next; no pega directo al backend. No hay Java ni Redis (el stack Spring original fue retirado).

## Desarrollo local

Requisitos: Docker + Docker Compose y Node.js 20+.

```bash
docker compose up -d          # postgres + api-py + web
```

- Web: http://localhost:3000
- API (FastAPI): http://localhost:8000 · docs en http://localhost:8000/docs

Para iterar el frontend con hot-reload, corré `web/` localmente contra la API en Docker:

```bash
cd web && pnpm install && pnpm run dev
```

El scraper se corre on-demand:

```bash
docker compose run --rm scraper run all      # o: run <job>, list, status, seed-events
docker compose run --rm scraper db upgrade   # aplicar migraciones del esquema
```

## Variables de entorno

- `web/.env.local` (a partir de `web/.env.example`): `NEXT_PUBLIC_LABRECHA_API_URL` solo si querés
  saltear el proxy y pegar directo a la API; en producción el server usa `LABRECHA_API_INTERNAL_URL`.
- Base de datos: valores por defecto en `docker-compose.yml` (`DB_NAME`/`DB_USERNAME`/`DB_PASSWORD`).

## Estructura

```
scraper/   labrecha_scraper/ (base, registry, cli, connectors/*)
api-py/    labrecha_api/ (main, routers/*, income_tax, models, schemas)
web/       src/ (app/, components/{core,home,indicator,congress,layout,ui}, hooks/, lib/)
nginx/     reverse proxy de producción (COMPARTIDO con otros sitios — editar con cuidado)
```

## Convenciones

Sin comentarios en el código; igualdad estricta; nombres completos en inglés (términos de dominio
argentino en español); sin `any`/casteos inseguros/supresores de lint. Detalle en
[CLAUDE.md](./CLAUDE.md).

Antes de commitear (frontend): `cd web && pnpm exec tsc --noEmit && pnpm run lint:check && pnpm run build`.

## Licencia

Privado
