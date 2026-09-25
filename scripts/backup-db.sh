#!/bin/bash

# Copia de seguridad de PostgreSQL desde el cron del host.
# La base es el único lugar donde vive la serie histórica completa: los IPC provinciales, los PDFs
# del BCRA y las votaciones viejas no siempre se pueden volver a scrapear hacia atrás. Un volumen
# borrado sin esto es arrancar el observatorio de cero.
# Formato custom (-Fc): comprimido y restaurable tabla por tabla con pg_restore.
#
# Config por env:
#   BACKUP_DIR              destino (default /var/backups/labrecha)
#   BACKUP_RETENTION_DAYS   días a conservar (default 14)
#   BACKUP_MIN_KEEP         copias recientes que nunca se borran, pase lo que pase (default 3)
#   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID  (opcional) → avisa cuando el backup falla
#
# Cron sugerido (diario a las 04:15, antes de las corridas del scraper):
#   15 4 * * * /ruta/al/repo/scripts/backup-db.sh >> /var/log/labrecha/backup.log 2>&1
#
# Restaurar una copia sobre la base viva:
#   docker compose -f docker-compose.prod.yml exec -T postgres \
#     sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < archivo.dump

set -euo pipefail
umask 077

cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/labrecha}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
MIN_KEEP="${BACKUP_MIN_KEEP:-3}"
FILE_PREFIX="labrecha"
MIN_DUMP_BYTES=10240

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="${BACKUP_DIR}/${FILE_PREFIX}-${timestamp}.dump"

log() {
  local now
  now="$(date -u +%FT%TZ)"
  echo "[${now}] backup-db: $1"
}

notify_failure() {
  local reason="$1"
  local message="La Brecha — backup de la base FALLÓ: ${reason}"

  log "${message}" >&2

  if [[ -n "${TELEGRAM_BOT_TOKEN:-}" ]] && [[ -n "${TELEGRAM_CHAT_ID:-}" ]]; then
    curl -s -o /dev/null \
      --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
      --data-urlencode "text=${message}" \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" || true
  fi

  exit 1
}

mkdir -p "${BACKUP_DIR}"

log "volcando a ${target}"

if ! docker compose -f "${COMPOSE_FILE}" exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "${target}"; then
  rm -f "${target}"
  notify_failure "pg_dump terminó con error"
fi

size="$(wc -c < "${target}" | tr -d ' ')"
if [[ "${size}" -lt "${MIN_DUMP_BYTES}" ]]; then
  rm -f "${target}"
  notify_failure "el volcado pesa ${size} bytes, menos que el mínimo de ${MIN_DUMP_BYTES}"
fi

if ! docker compose -f "${COMPOSE_FILE}" exec -T postgres \
  pg_restore --list > /dev/null < "${target}"; then
  rm -f "${target}"
  notify_failure "el volcado quedó ilegible para pg_restore (un dump truncado se escribe sin error)"
fi

log "ok, ${size} bytes"

remaining="$(find "${BACKUP_DIR}" -maxdepth 1 -type f -name "${FILE_PREFIX}-*.dump" | wc -l | tr -d ' ')"

while IFS= read -r stale; do
  [[ -n "${stale}" ]] || continue
  if [[ "${remaining}" -le "${MIN_KEEP}" ]]; then
    break
  fi
  rm -f "${stale}"
  remaining=$((remaining - 1))
  stale_name="$(basename "${stale}")"
  log "borrada copia vencida ${stale_name}"
done < <(
  find "${BACKUP_DIR}" -maxdepth 1 -type f -name "${FILE_PREFIX}-*.dump" \
    -mtime "+${RETENTION_DAYS}" -printf '%T@ %p\n' | sort -n | cut -d' ' -f2- || true
)

log "${remaining} copias en ${BACKUP_DIR}"
