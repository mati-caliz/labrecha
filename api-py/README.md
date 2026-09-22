# La Brecha — API (FastAPI)

API de solo lectura sobre los indicadores que el `scraper/` ingiere a PostgreSQL. Sin estado y
sin auth. Los modelos salen del paquete `labrecha_db` de `shared/`, que es la única definición
del esquema: esta app no define tablas propias.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Healthcheck. |
| GET | `/indicators` | Lista de indicadores con sus fuentes, cantidad y rango de fechas. |
| GET | `/indicators/{code}` | Serie temporal. Filtros: `source`, `date_from`, `date_to`, `limit`, `order`. |
| GET | `/indicators/{code}/sources` | Fuentes de un indicador con su último valor — base del comparador de mediciones. |
| GET | `/political-events` | Hitos políticos para anotar series. Filtros: `date_from`, `date_to`, `category`. |
| GET | `/congress/votes` | Votaciones de Diputados. Filtros: `date_from`, `date_to`, `result`, `period_number`, `limit`, `offset`. |
| GET | `/congress/votes/{acta_id}` | Cabecera de una votación con su tanteo. |
| GET | `/congress/votes/{acta_id}/details` | Voto por diputado. Filtros: `vote`, `bloc`. |
| GET | `/senate/members` | Composición del Senado. Filtros: `bloc`, `province`. |
| GET | `/senate/blocs` | Composición agregada por bloque. |
| GET | `/holidays` | Feriados. Filtros: `year`, `date_from`, `date_to`. |
| GET | `/news` | Noticias. Filtros: `source`, `category`, `limit`, `offset`. |
| POST | `/calculators/compound-interest` | Interés compuesto (capital, tasa, plazo, frecuencia, aportes). |
| POST | `/calculators/inflation-adjustment` | Ajuste por inflación entre dos meses usando `ipc_mensual`. |
| POST | `/calculators/income-tax` | Sueldo neto (Impuesto a las Ganancias): deducciones legales, cargas de familia, deducciones personales y escala progresiva. |
| GET | `/scrape-runs` | Última corrida de cada job del scraper (monitoreo). |

Docs interactivas en `/docs` (Swagger) y `/redoc`.

## Uso

Local:

```bash
uvicorn labrecha_api.main:app --reload
```

Vía Docker Compose (servicio `api-py`, publicado en `127.0.0.1:8000`, habla con `postgres` por la
red interna):

```bash
docker compose up -d api-py
```

Configuración por entorno (ver `.env.example`): `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`.

Los importes de la escala de Ganancias son constantes en `income_tax.py`, con su
`effective_from` y su fuente: ARCA los actualiza cada seis meses y actualizarlos es editar ese
módulo. La respuesta lleva esos datos, y la UI avisa sola cuando pasó un semestre.
