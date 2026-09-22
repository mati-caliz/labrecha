# El modelo de datos

PostgreSQL es el contrato entre las cuatro piezas. El esquema se define una sola vez, en los
modelos SQLAlchemy de `shared/labrecha_db`; ni el scraper ni la API definen tablas propias.

## La tabla genérica

`indicator_history(indicator_code, source, date, value, meta)` guarda **toda** serie temporal y
es única por `(indicator_code, source, date)`. Que un mismo `indicator_code` admita varias
`source` es justamente de donde sale el comparador de mediciones.

## `scrape_runs`: una fila por corrida

Estados: `running`, `success`, `error` y **`empty`**. El último es el interesante: la corrida
terminó sin excepción pero trajo menos filas que el `min_rows` del conector (por defecto 1). Los
conectores que legítimamente pueden no traer nada nuevo declaran `min_rows = 0`. Un `empty` sale
ámbar en `/estado` y cuenta como fallo para `scripts/scrape-alert.sh`: un scraper que dejó de
encontrar datos no puede verse igual que uno que anduvo.

Al arrancar un job, `close_interrupted_runs` cierra como `error` las corridas del mismo job que
sigan en `running` hace más de 6 horas — proceso muerto, o un deploy en el medio.

## `error_events`: los errores de producción

Se agrupan **por fingerprint**: origen, tipo, mensaje normalizado y primera línea del stack, con
los números y los valores entre comillas reemplazados. Cada fila lleva contador y
`first/last_seen_at`.

Lo escriben tres lugares: la API (`exception_handler`, **sólo** excepciones no manejadas — los
404 y 422 no son ruido que valga la pena), el SSR de Next (`instrumentation.ts`) y el navegador
(`ErrorBoundary` y `lib/logger.ts`). Los tres van por `POST /errors`, que es **same-origin**: así
no hay que tocar ninguno de los **dos** CSP (el de `next.config.js` y el del nginx compartido) y
queda cubierto por el rate limit por IP.

Se ve en `/estado`, pero **el `stack` no es público**: `GET /errors` sólo lo devuelve con
`X-Admin-Token` (`admin_auth.py`), porque expone rutas internas y, si el error vino de SQLAlchemy,
fragmentos de SQL. Tipo, mensaje, ruta y contador sí son públicos: la transparencia del pipeline
es parte del observatorio.

Como `POST /errors` es escritura anónima y la tabla sólo crece, `labrecha-scraper prune-errors`
(cron diario, `scripts/prune-errors.sh`) borra lo vencido según `ERROR_RETENTION_DAYS` y recorta
al tope de `ERROR_MAX_ROWS`.

## Tablas propias

Para lo que no encaja en la genérica: `congress_votes` y `congress_vote_details`, `senators`,
`holidays`, `news_articles`, `congress_vote_summaries`. Y `political_events(date, title,
category, description)`, que es lo que anota las series.

## Las votaciones del Congreso: tres conectores para una tabla

Las dos cámaras conviven en `congress_votes.chamber` y la llenan **tres conectores distintos**,
porque ninguna fuente cubre todo:

- **`connectors/congress`** baja el dataset CKAN `votaciones_nominales` de HCDN, que **quedó
  congelado el 03/02/2020** (última acta: 29/01/2020, períodos 129–137). Es el backfill histórico
  y nada más: no trae una votación nueva desde entonces.
- **`connectors/hcdn_votes`** continúa esa serie scrapeando
  `votaciones.hcdn.gob.ar/votacion/{acta_id}`. La clave: **ese `acta_id` es el mismo que el del
  dataset viejo** (verificado acta por acta), así que se sigue la numeración desde la última
  cargada en vez de listar — la plataforma arma el listado por JavaScript y no expone el endpoint.
  Tiene API oficial (OpenAPI, ver `/desarrolladores`) pero HCDN dejó de emitir API-KEY.

  **Ojo con `/sistema/exportar-datos-completo`**, que aparece en el footer: es un link oculto
  (`class="link-secreto-legal"`, `rel=nofollow`, `tabindex=-1`), o sea una trampa para crawlers.
  **No usarlo.**
- **`connectors/senate_votes`** scrapea `senado.gob.ar/votaciones/actas` (POST con
  `busqueda_actas[anio]`) y el `detalleActa` de cada acta nueva. Los ids van prefijados con `S-`
  para no chocar con los de HCDN. El backfill va de a un año por corrida hacia atrás, y `run_job`
  commitea una sola vez: un año queda cargado entero o no queda nada y se reintenta.

El detalle guarda `legislator_name`, no `deputy_name`: también hay senadores. Y el presentismo
por bloque se agrupa **por cámara además de por bloque**, porque un mismo nombre de bloque puede
existir en las dos y los denominadores no son comparables.

## `congress_vote_summaries`: el título en castellano

El título del acta es burocrático ("Expediente 0073-S-2019 - Votación en General"), así que
`connectors/congress_summaries` cruza los expedientes citados contra el dataset de proyectos de
HCDN y le pide a Claude (vía `llm.py`, igual que el Boletín Oficial) una oración en lenguaje
llano más un tema. **Siempre se muestra junto al título oficial y aclarando que lo generó una
IA.**

Las votaciones que no se pudieron resumir guardan igual su fila con `summary` en NULL: es la
marca de "ya intentada". Sin ella coparían la ventana acotada de cada corrida y el backfill nunca
avanzaría. Se reintentan a los 30 días.
