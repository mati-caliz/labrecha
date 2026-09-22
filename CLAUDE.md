# La Brecha

Observatorio público de métricas político-económicas de Argentina: reúne indicadores dispersos
(INDEC, BCRA, datos.gob.ar, consultoras, Congreso) en una sola fuente. Solo lectura, sin auth.
Dominio objetivo `labrecha.ar`. Nació como "FinArg", con un stack Spring y Redis que se retiró
por completo.

Dos features lo definen: **la brecha entre mediciones** —mostrar la discrepancia ES el producto—
y **las series anotadas con eventos políticos**. Cómo se calcula cada una está en
[`docs/brechas.md`](docs/brechas.md).

## Reglas duras de producto

- **Ningún dato se muestra sin su fuente y su fecha visibles** (requisito legal con algunas
  fuentes): el patrón de atribución es parte del diseño. Aplica también a lo que la app
  *calcula*: la escala de Ganancias (`api-py/labrecha_api/income_tax.py`) es un `IncomeTaxScale`
  con `effective_from` y `source` que viajan en la respuesta, y la UI avisa sola cuando pasó un
  semestre, porque ARCA la actualiza cada seis meses.
- **Nunca fabricar un dato.** `web/src/lib/series.ts` devuelve `null` —no el primer valor, no
  cero— antes del primer punto de una fuente; el chart corta la línea y sólo pinta la banda de
  brecha donde las dos fuentes midieron. Las series `*_real` de `connectors/derived.py` se
  deflactan contra un **mes base fijo** (`DEFLATED_BASE_MONTH`) para que un CSV descargado el mes
  pasado siga coincidiendo.
- **Fallar ruidosamente.** Todo scraper de PDF o HTML es frágil: que quede en `scrape_runs`,
  nunca escribir datos dudosos en silencio.
- **La magnitud de una brecha es la misma en todos lados**: pp cuando la unidad es `%`, relativa
  cuando son niveles. El número que se ordena es el que se muestra, y volver al cociente entre
  porcentajes rompe el ranking (ver `docs/brechas.md`).

## Arquitectura

Monorepo de cuatro piezas; **PostgreSQL es el contrato** entre ellas, sin colas ni mensajería.

- **`shared/`** — el paquete `labrecha_db`: modelos SQLAlchemy y migraciones Alembic. Es la
  **única** definición del esquema; lo instalan el scraper y la API, y ninguno define tablas
  propias. Todo cambio va con migración, la aplica `labrecha-scraper db upgrade` (el deploy la
  corre antes de levantar los servicios) y se audita con `db check` contra los modelos.
- **`scraper/`** — un conector es un módulo en `labrecha_scraper/connectors/`, extiende la clase
  base y registra en `scrape_runs`. Corre por cron.
- **`api-py/`** — FastAPI de solo lectura más las calculadoras. Sin estado y sin auth; es
  producto además de backend: gzip, CSV por serie, docs en `/docs` y rate limit por IP, exento
  para la red interna así el SSR no se auto-limita.
- **`web/`** — Next.js 16 con App Router. Consume la API por un proxy same-origin, nunca directo
  desde el navegador.

El contexto de build de las imágenes Python es la raíz del repo, porque necesitan `shared/`; de
ahí el `dockerfile: api-py/Dockerfile` del compose.

**La base es el único lugar donde vive la serie histórica completa** —los IPC provinciales, los
PDF del BCRA y las votaciones viejas no siempre se pueden volver a scrapear hacia atrás—, así que
`scripts/backup-db.sh` (cron diario del host) hace `pg_dump -Fc` y **verifica el volcado** con
`pg_restore --list` antes de darlo por bueno, y rota por `BACKUP_RETENTION_DAYS` sin bajar nunca
de `BACKUP_MIN_KEEP` copias. Si algo falla borra el archivo parcial y avisa: un backup roto que
se descubre el día que hace falta no es un backup.

**IP del cliente:** `X-Real-IP` (nginx la sobrescribe siempre) o, si falta, el **último** hop de
`X-Forwarded-For` — nunca el primero, que lo controla el cliente.
(`api-py/labrecha_api/rate_limit.py` y `web/src/lib/clientIp.ts`.)

## Dónde está el detalle

| Doc | Qué contesta |
|---|---|
| [`docs/brechas.md`](docs/brechas.md) | curadas contra automáticas, la magnitud en pp, los IPC provinciales, el corte por mandato |
| [`docs/datos.md`](docs/datos.md) | la tabla genérica, los estados de `scrape_runs`, `error_events` y los tres conectores de votaciones |
| [`docs/frontend.md`](docs/frontend.md) | el BFF y su whitelist, el prefetch, `/admin`, diseño, SEO, `/comparar`, el embed y sus dos CSP |

Lo que conviene tener presente sin abrirlos:

- `indicator_history` es la tabla genérica de toda serie temporal, única por
  `(indicator_code, source, date)`. Varias `source` por indicador es de donde sale el comparador.
- El `POST` del proxy del front tiene **whitelist**: lo único que escribe es `/errors`. No lo
  conviertas en el agujero por donde se llega al próximo endpoint de escritura.
- `/admin` es la **única** superficie de escritura de la web.
- El embed es el único lugar con `frame-ancestors *`, y su CSP vive en dos archivos que tienen
  que coincidir.

## Estilo

Rigen las reglas globales. Lo propio de este repo:

- **Los términos de dominio van en inglés**: `quote` no `cotizacion`, `gap` no `brecha`,
  `reserves` no `reservas`. "La Brecha" como nombre de producto no se traduce.
- **Las URLs de la web van en español** (`/indicador/[code]`, `/brechas`, `/calculadoras`); las
  viejas en inglés redirigen 301 en `next.config.js`. Los endpoints de la FastAPI **sí** quedan
  en inglés.
- Ningún número se muestra en serif ni en sans: siempre mono tabular y en formato argentino.
- Lint del front con **Biome**, no ESLint. En Python, inyección por módulo o función y tipado con
  pydantic.

## Verificación

- **Front** (`cd web`): `pnpm exec tsc --noEmit`, `pnpm run lint:check`, `pnpm test` y el build.
- **Python**: `ruff check` y `ruff format --check` sobre `api-py/labrecha_api api-py/tests
  scraper/labrecha_scraper shared/labrecha_db` (el `ruff.toml` es estricto), `python -m compileall`
  y `python -m pytest api-py/tests`. La suite tiene dos mitades: la lógica pura de cálculo corre
  sin nada, y los tests de integración necesitan Postgres —los routers contra SQL real y las
  migraciones contra los modelos—. Sin base esa mitad **se saltea sola**; con
  `REQUIRE_TEST_DATABASE=1` el skip pasa a ser error. La base de test se crea sola y se apunta con
  `TEST_DATABASE_URL` (default `…@localhost:5433/labrecha_test`).
- **Nada de esto lo corre nadie por vos**: desde el 2026-09-22 el deploy no se dispara por push
  (`deploy.yml` quedó en `workflow_dispatch`) y el CI sólo corre en pull requests, que acá no se
  usan. Un push a `main` que rompa lint, tipos, tests o build no se entera hasta el próximo
  deploy: la verificación local es el único gate real.
- **Datos**: `python -m labrecha_scraper run <job|all>` (ver `list`, `status`). Postgres local en
  el 5433; `docker compose up -d` levanta postgres, api-py y web, y el scraper corre on-demand.

## Nota

`nginx/nginx.conf` es **compartido** con otros sitios en producción (gastronova, portfolio,
conseguilo): editarlo con cuidado quirúrgico, tocando sólo el server de este sitio.
