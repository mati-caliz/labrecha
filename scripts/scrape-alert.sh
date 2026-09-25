#!/bin/bash

# Alerta cuando un conector del scraper falla N corridas seguidas.
# Cuenta como fallo cualquier estado distinto de 'success': tanto 'error' como 'empty'
# (corrió sin excepción pero no trajo el mínimo de filas esperado).
# Pensado para el cron del host, después de las corridas (ver scrape-cron.sh).
# Config por env:
#   FAILURE_THRESHOLD   corridas fallidas seguidas para alertar (default 3)
#   TELEGRAM_BOT_TOKEN  + TELEGRAM_CHAT_ID  (opcional) → notifica por Telegram
# Sin Telegram configurado, imprime a stdout y sale != 0 para que el MAILTO del cron lo capture.

set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.prod.yml"
THRESHOLD="${FAILURE_THRESHOLD:-3}"
# Conectores pausados hasta contar con una fuente accesible. Sus fallos históricos
# no deben disparar alertas mientras quedan fuera de las corridas automáticas.
DISABLED_JOBS="'hcdn_votes', 'official_gazette'"

failing="$(
  docker compose -f "${COMPOSE_FILE}" exec -T postgres \
    sh -c 'psql -tAX -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<SQL
WITH ranked AS (
  SELECT job_name, status,
         row_number() OVER (PARTITION BY job_name ORDER BY started_at DESC) AS rn
  FROM scrape_runs
  WHERE job_name NOT IN (${DISABLED_JOBS})
)
SELECT job_name
FROM ranked
WHERE rn <= ${THRESHOLD}
GROUP BY job_name
HAVING count(*) = ${THRESHOLD}
   AND count(*) FILTER (WHERE status = 'success') = 0
ORDER BY job_name;
SQL
)"

failing="$(printf '%s\n' "${failing}" | sed '/^[[:space:]]*$/d')"

checked_at="$(date -u +%FT%TZ)"

if [[ -z "${failing}" ]]; then
  echo "[${checked_at}] scrape-alert: todos los conectores OK (umbral ${THRESHOLD})"
  exit 0
fi

count="$(printf '%s\n' "${failing}" | wc -l | tr -d ' ')"
message="La Brecha — scraper: ${count} conector(es) fallaron las últimas ${THRESHOLD} corridas:
$(printf '%s\n' "${failing}" | sed 's/^/• /')"

echo "[${checked_at}] scrape-alert:"
printf '%s\n' "${message}"

if [[ -n "${TELEGRAM_BOT_TOKEN:-}" ]] && [[ -n "${TELEGRAM_CHAT_ID:-}" ]]; then
  if curl -s -o /dev/null \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${message}" \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage"; then
    echo "scrape-alert: notificado por Telegram"
  else
    echo "scrape-alert: falló el envío por Telegram" >&2
  fi
fi

exit 1
