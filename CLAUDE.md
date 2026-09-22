# La Brecha — configuración para asistentes de IA

Observatorio público (solo lectura, sin auth) de métricas político-económicas de Argentina: reúne
indicadores dispersos (INDEC, BCRA, datos.gob.ar, consultoras, Congreso) en una sola fuente. Dominio
objetivo `labrecha.ar`. Nació como "FinArg" (stack Spring + Redis, ya retirado por completo) y pivoteó
a observatorio; los roadmaps que documentaban ese pivot, el rediseño y la auditoría 2026 se fueron
cumpliendo y se borraron: lo que sobrevive de ellos está en este archivo y en el historial de git.

Dos features definitorias:

1. **La brecha entre mediciones.** Mostrar la discrepancia ES la feature. Las **curadas**
   (`web/src/lib/gaps.ts`) enfrentan indicadores *distintos* (blue vs oficial, inflación esperada vs
   medida); las **automáticas** (`GET /gaps`) salen solas de los datos: todo `indicator_code` con ≥2
   `source` **que declaren la misma `meta.unit`**, comparado en la última fecha en que ambas midieron.
   Otra unidad o sin unidad declarada queda fuera del ranking (comparar millones contra unidades
   inventa brechas de escala) y viaja en `excluded_sources` con el motivo.
   Quien alimenta el ranking es `connectors/cpi_jurisdictions`: las ocho jurisdicciones que miden
   su propio IPC (CABA, Córdoba, Mendoza, Neuquén, San Luis, Santa Fe, Tucumán, Chaco) publican
   **índices con bases distintas**, así que no se comparan niveles: se deriva la variación
   mensual/interanual, que es independiente de la base, y se fecha a **fin de mes** para que caiga
   en la misma fecha que la serie nacional de `argentinadatos`. La discrepancia que sale de ahí es
   de cobertura geográfica además de metodológica: `meta.geography` y `meta.agency` viajan en cada
   punto para poder decirlo. Para unidades en `%` la UI muestra la brecha en **pp**
   (`automaticGapMagnitude`), no como cociente entre porcentajes. `GET /gaps/{code}/history` recorre
   toda la serie y devuelve la brecha más ancha, la más angosta y la última. **Todo lo que rankea usa
   la misma magnitud** (`_gap_magnitude` en la API, `computeGap`/`automaticGapMagnitude` en la web):
   **pp** cuando la unidad es `%`, brecha relativa cuando son niveles — el número que se ordena es el
   que se muestra. Ojo con volver al cociente: dos porcentajes cerca de cero (déficit 0,1 % vs 0,4 %)
   dan 300 % de "brecha" y coparían el ranking mostrando 0,30 pp.
2. **Series anotadas con eventos políticos.** `GET /terms/{code}` corta cualquier serie por mandato
   presidencial (`api-py/labrecha_api/government_terms.py`): las tasas se acumulan **componiendo**
   (`MONTHLY_RATE_INDICATORS`), los niveles comparan extremos; la respuesta dice qué método usó y la
   UI lo explicita.

## Reglas duras de producto

- **Ningún dato se muestra sin su fuente + fecha visibles** (requisito legal con algunas fuentes): el
  patrón de atribución es parte del diseño. Aplica a lo que la app *calcula*: la escala de Ganancias
  (`api-py/labrecha_api/income_tax.py`) es un `IncomeTaxScale` con `effective_from` + `source` que
  viaja en la respuesta, y la UI avisa sola cuando pasó un semestre (ARCA actualiza cada seis meses).
- **Nunca fabricar dato.** `web/src/lib/series.ts` devuelve `null` —no el primer valor, no cero— antes
  del primer punto de una fuente; el chart corta la línea y sólo pinta la banda de brecha donde las
  dos fuentes midieron. Las series `*_real` de `connectors/derived.py` se deflactan contra un **mes
  base fijo** (`DEFLATED_BASE_MONTH`) para que un CSV descargado el mes pasado siga coincidiendo.
- **Fallar ruidosamente.** Todo scraper de PDF/HTML es frágil: que quede en `scrape_runs`, nunca
  escribir datos dudosos en silencio.

## Arquitectura

Monorepo de cuatro piezas; **PostgreSQL es el contrato** entre ellas (sin colas ni mensajería). No hay
backend Java ni Redis: el stack Spring original fue retirado por completo.

La base es además el único lugar donde vive la serie histórica completa —los IPC provinciales, los
PDFs del BCRA y las votaciones viejas no siempre se pueden volver a scrapear hacia atrás—, así que
`scripts/backup-db.sh` (cron diario del host) hace `pg_dump -Fc`, **verifica el volcado** con
`pg_restore --list` antes de darlo por bueno y rota por `BACKUP_RETENTION_DAYS` sin bajar nunca de
`BACKUP_MIN_KEEP` copias. Si algo falla, borra el archivo parcial y avisa (Telegram opcional, igual
que `scrape-alert.sh`): un backup roto que se descubre el día que hace falta no es un backup.

- `shared/` — paquete `labrecha_db`: modelos SQLAlchemy (**única** definición del esquema) +
  migraciones Alembic. Lo instalan el scraper y la API; ninguno de los dos define tablas propias. Todo
  cambio de esquema va con migración, aplicada por `labrecha-scraper db upgrade` (el deploy la corre
  antes de levantar los servicios) y auditable con `db check` contra los modelos.
- `scraper/` — un conector = un módulo en `labrecha_scraper/connectors/`, extiende la clase base y
  registra en `scrape_runs`. Corre por cron.
- `api-py/` — FastAPI de solo lectura + calculadoras. Sin estado, sin auth; es producto además de
  backend (gzip, CSV por serie, docs en `/docs`, rate limit por IP exento para la red interna así el
  SSR no se auto-limita).
- `web/` — Next.js 16 (App Router) + React 18 + TS + Tailwind.

El contexto de build de las imágenes Python es la raíz del repo (necesitan `shared/`), de ahí
`dockerfile: api-py/Dockerfile` en el compose.

**IP del cliente:** `X-Real-IP` (nginx la sobrescribe siempre) o, si falta, el **último** hop de
`X-Forwarded-For` — nunca el primero, que lo controla el cliente. `api-py/labrecha_api/rate_limit.py`
y `web/src/lib/clientIp.ts`.

## Modelo de datos

- `indicator_history(indicator_code, source, date, value, meta)` — tabla genérica de toda serie
  temporal, única por `(indicator_code, source, date)`. Varias `source` por `indicator_code`: de ahí
  sale el comparador de mediciones.
- `scrape_runs` — una fila por corrida. Estados: `running`, `success`, `error` y **`empty`** (terminó
  sin excepción pero trajo menos filas que el `min_rows` del conector — default 1; los que
  legítimamente pueden no traer nada nuevo declaran `min_rows = 0`). `empty` sale ámbar en `/estado` y
  cuenta como fallo para `scripts/scrape-alert.sh`. Al arrancar un job, `close_interrupted_runs` cierra
  como `error` las corridas del mismo job en `running` hace más de 6 h (proceso muerto, deploy en el
  medio).
- `political_events(date, title, category, description)` — anota las series.
- `error_events` — errores de producción **agrupados por fingerprint** (origen + tipo + mensaje
  normalizado + primera línea del stack, con números y valores entre comillas reemplazados), con
  contador y `first/last_seen_at`. Lo escriben la API (`exception_handler`, sólo excepciones no
  manejadas: los 404/422 no son ruido), el SSR de Next (`instrumentation.ts`) y el navegador
  (`ErrorBoundary` y `lib/logger.ts`) vía `POST /errors`, que es same-origin —así no hay que tocar
  ninguno de los **dos** CSP (el de `next.config.js` y el del nginx compartido)— y queda cubierto por
  el rate limit por IP. Se ve en `/estado`, pero **el `stack` no es público**: `GET /errors` sólo lo
  devuelve con `X-Admin-Token` (`admin_auth.py`), porque expone rutas internas y, si el error vino de
  SQLAlchemy, fragmentos de SQL. Tipo, mensaje, ruta y contador sí son públicos: la transparencia del
  pipeline es parte del observatorio. Como `POST /errors` es escritura anónima y la tabla sólo crece,
  `labrecha-scraper prune-errors` (cron diario, `scripts/prune-errors.sh`) borra lo vencido
  (`ERROR_RETENTION_DAYS`) y recorta al tope (`ERROR_MAX_ROWS`).
- Tablas propias para lo que no encaja en la genérica: `congress_votes`/`congress_vote_details`,
  `senators`, `holidays`, `news_articles`, `congress_vote_summaries`.
- `congress_votes.chamber` — las dos cámaras conviven en la misma tabla y **tres conectores
  distintos** la llenan, porque ninguna fuente cubre todo:
  - `connectors/congress` baja el dataset CKAN `votaciones_nominales` de HCDN, que **quedó congelado
    el 03/02/2020** (última acta: 29/01/2020, períodos 129–137). Es el backfill histórico y nada más:
    no trae una votación nueva desde entonces.
  - `connectors/hcdn_votes` continúa esa serie scrapeando `votaciones.hcdn.gob.ar/votacion/{acta_id}`.
    Clave: **ese `acta_id` es el mismo que el del dataset viejo** (verificado acta por acta), así que
    se sigue la numeración desde la última cargada en vez de listar — la plataforma arma el listado por
    JavaScript y no expone el endpoint. Tiene API oficial (OpenAPI, ver `/desarrolladores`) pero HCDN
    dejó de emitir API-KEY. Ojo: el `/sistema/exportar-datos-completo` que aparece en el footer es un
    link oculto (`class="link-secreto-legal"`, `rel=nofollow`, `tabindex=-1`), o sea una trampa para
    crawlers: **no usarlo**.
  - `connectors/senate_votes` scrapea `senado.gob.ar/votaciones/actas` (POST con `busqueda_actas[anio]`)
    y el `detalleActa` de cada acta nueva. Los ids van prefijados `S-` para no chocar con los de HCDN.
    Backfill de a un año por corrida hacia atrás, y `run_job` commitea una sola vez, así que un año
    queda cargado entero o no queda nada y se reintenta.
  El detalle guarda `legislator_name` (no `deputy_name`: también hay senadores) y el presentismo por
  bloque se agrupa **por cámara además de por bloque**, porque un mismo nombre de bloque puede existir
  en las dos y los denominadores no son comparables.
- `congress_vote_summaries` — el título del acta es burocrático ("Expediente 0073-S-2019 - Votación en
  General"), así que `connectors/congress_summaries` cruza los expedientes citados contra el dataset de
  proyectos de HCDN y le pide a Claude (vía `llm.py`, igual que el Boletín Oficial) una oración en
  lenguaje llano + un tema. Siempre se muestra junto al título oficial y aclarando que lo generó una
  IA. Las votaciones que no se pudieron resumir guardan igual su fila con `summary` en NULL: es la
  marca de "ya intentada" — sin ella coparían la ventana acotada de cada corrida y el backfill nunca
  avanzaría. Se reintentan a los 30 días.

## Frontend (web/)

- **BFF same-origin:** el navegador pega a `/api/data/...` y `src/app/api/data/[...path]/route.ts`
  proxya a la FastAPI (`LABRECHA_API_INTERNAL_URL`) con ISR por ruta. El cliente
  (`src/lib/labrechaApi.ts`) es **isomórfico**: en el browser va por el proxy, en el servidor directo
  a la API vía `serverGet` (`src/lib/serverApi.ts`). Los TTL son únicos y viven en
  `src/lib/cacheRules.ts`. El `POST` del proxy tiene whitelist (`POSTABLE_PATHS`): lo único que
  escribe es `/errors`; las calculadoras van por `POST` porque llevan cuerpo, pero no tocan la base,
  y sus rutas salen de `src/lib/calculatorPaths.ts` para que el cliente y la whitelist no puedan
  divergir —cuando divergieron, las cuatro calculadoras devolvían 404 en el navegador—. El proxy no
  debe ser el agujero por el que se llegue al próximo endpoint de escritura que se agregue.
- **Datos en el servidor:** cada `page.tsx` prefetchea sus queries y las hidrata con
  `<PrefetchedQueries>`, así el HTML sale con contenido real (no skeletons) y las páginas se
  prerenderizan. Para que la clave del prefetch no pueda divergir de la del hook, ambas salen de las
  factorías de `src/lib/queries.ts`; qué necesita cada ruta está en `src/lib/pageQueries.ts` y los
  params compartidos en `src/lib/queryParams.ts` — **módulo plano a propósito**: un `"use client"`
  exporta referencias, no valores, así que las constantes que lee el servidor no pueden vivir en un
  componente cliente.
- **Admin (única superficie de escritura):** `/admin` se autentica contra `ADMIN_PASSWORD` y guarda
  una cookie HttpOnly cuyo token es `<expiresAt>.<hmac>` — el vencimiento va **dentro** de la firma
  (`lib/adminSession.ts`), no sólo en el `Max-Age`. El login limita intentos por IP en memoria
  (`lib/loginAttempts.ts`).
- **Diseño:** dirección "Editorial" (periodística de datos); tokens `oklch` light+dark en
  `src/app/globals.css`, bloque "Design system v2" — ahí están los nombres, no hace falta listarlos
  acá. **`--gap` ámbar** es siempre discrepancia entre fuentes y **`--event` violeta** siempre evento
  político. Tres tipografías: display (titulares), serif (prosa), mono (números/labels). Regla: ningún
  número va en serif o sans, siempre **mono tabular** y en formato argentino (punto de miles, coma
  decimal). Los componentes de `src/components/core/` usan estilos inline con esas variables; el resto,
  Tailwind.
- **URLs en español** igual que el copy (`/indicador/[code]`, `/brechas`, `/calculadoras`…); las viejas
  en inglés redirigen 301 en `next.config.js`. Los endpoints de la FastAPI **sí** quedan en inglés.
- **SEO:** JSON-LD en `src/lib/structuredData.ts`, emitido con `<JsonLd>`, que escapa `<`/`>`/`&` a
  `\uXXXX` para inyectarlo como texto: biome corre con `security: all`, así que no se usa
  `dangerouslySetInnerHTML`. Las `opengraph-image.tsx` comparten el marco de marca en
  `src/lib/ogImage.tsx`.
- **`/comparar`** pone dos series en el mismo eje **indexadas a 100** en su primer mes en común
  (`src/lib/compare.ts`): compara ritmos, nunca niveles, y si no hay ningún mes compartido lo dice en
  vez de inventar una base. El par viaja en la URL (`?a=&b=`) para que sea compartible.
- **`/embed/indicador/[code]`** es el gráfico incrustable. Va sin chrome porque `SiteChrome` detecta
  el prefijo, y es el **único** lugar con `frame-ancestors *`. Eso vive en dos lados que tienen que
  coincidir: `next.config.js` (donde la regla general es `/:path((?!embed/).*)` — si volviera a ser
  `/:path*` matchearía también el embed y le pisaría el CSP) y el `location /embed/` del nginx
  compartido, porque el navegador aplica la **intersección** de ambos CSP. Lo cubre
  `__tests__/securityHeaders.test.ts`.
- **Alertas por umbral:** `/indicador/[code]/feed.xml?umbral=N&direccion=arriba|abajo` filtra el RSS
  a los datos que cruzan el umbral (`src/lib/feedAlerts.ts`). Es "avisame cuando" sin pedir un mail
  ni guardar nada de nadie.

## Reglas de estilo de código

Rigen las reglas globales. Lo propio de este repo:

- **Los términos de dominio también van en inglés**: `quote` no `cotizacion`, `gap` no
  `brecha`, `reserves` no `reservas`. "La Brecha" como nombre de producto no se traduce.
- **Las URLs de la web van en español** (`/indicador/[code]`, `/brechas`,
  `/calculadoras`); las viejas en inglés redirigen 301 en `next.config.js`. Los
  endpoints de la FastAPI **sí** quedan en inglés.
- Lint del front con **Biome**, no ESLint.
- Python: inyección por módulo/función, tipado con pydantic.

## Verificación

- Front (`cd web`): `pnpm exec tsc --noEmit`, `pnpm run lint:check` (Biome, **no** ESLint), `pnpm test`,
  `pnpm run build`.
- Python: `ruff check` + `ruff format --check` sobre `api-py/labrecha_api api-py/tests
  scraper/labrecha_scraper shared/labrecha_db` (`ruff.toml` es estricto), `python -m compileall` y
  `python -m pytest api-py/tests`. La suite tiene dos mitades: lógica pura de cálculo (corre sin
  nada) y tests de integración que necesitan Postgres — los routers contra SQL real y las
  migraciones contra los modelos. Sin base, esa mitad se saltea sola; con `REQUIRE_TEST_DATABASE=1`
  (lo que usa el CI) el skip pasa a ser error. La base de test se crea sola; se apunta con
  `TEST_DATABASE_URL` (default `…@localhost:5433/labrecha_test`).
- **Nada de esto lo corre nadie por vos**: desde el 2026-09-22 el deploy no se dispara por push
  (`deploy.yml` quedó en `workflow_dispatch`) y el CI sólo corre en pull requests, que en este
  repo no se usan. Un push a `main` que rompa lint, tipos, tests o build no se entera hasta el
  próximo deploy: la verificación local es el único gate real.
- Datos: `python -m labrecha_scraper run <job|all>` (ver `list`, `status`). Postgres local en el 5433;
  `docker compose up -d` levanta postgres + api-py + web y el scraper corre on-demand.

## Notas

- `nginx/nginx.conf` es **compartido** con otros sitios en producción (gastronova, portfolio,
  conseguilo): editarlo con cuidado quirúrgico, tocando sólo el server de este sitio.
- Este archivo se carga entero en cada request: sólo contexto de negocio no obvio.
