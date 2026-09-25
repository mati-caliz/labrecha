#!/usr/bin/env bash
# Gate de calidad del monorepo. El host no tiene uv: Python corre en un contenedor con el
# entorno en un volumen propio, y los tests de la API contra un Postgres descartable.
set -euo pipefail
cd "$(dirname "$0")/.."

readonly UV_IMAGE="ghcr.io/astral-sh/uv:python3.12-bookworm-slim"
readonly POSTGRES_IMAGE="postgres:16-alpine"
readonly SHELLCHECK_IMAGE="koalaman/shellcheck:stable"
readonly NETWORK="labrecha-verify"
readonly DATABASE_CONTAINER="labrecha-verify-db"
readonly DATABASE_USER="labrecha"
readonly DATABASE_PASSWORD="labrecha123"
readonly PYTHON_MEMORY_LIMIT="1500m"
readonly DATABASE_MEMORY_LIMIT="256m"
readonly DATABASE_READY_ATTEMPTS=30
HOST_UID="$(id -u)"
HOST_GID="$(id -g)"
readonly HOST_OWNER="${HOST_UID}:${HOST_GID}"

remove_database() {
  docker rm -f "${DATABASE_CONTAINER}" >/dev/null 2>&1 || true
  docker network rm "${NETWORK}" >/dev/null 2>&1 || true
}

start_database() {
  remove_database
  docker network create "${NETWORK}" >/dev/null
  docker run -d --rm -m "${DATABASE_MEMORY_LIMIT}" --name "${DATABASE_CONTAINER}" --network "${NETWORK}" \
    -e POSTGRES_USER="${DATABASE_USER}" -e POSTGRES_PASSWORD="${DATABASE_PASSWORD}" \
    -e POSTGRES_DB="${DATABASE_USER}" "${POSTGRES_IMAGE}" >/dev/null
  for _ in $(seq "${DATABASE_READY_ATTEMPTS}"); do
    if docker exec "${DATABASE_CONTAINER}" pg_isready -q -U "${DATABASE_USER}"; then
      return 0
    fi
    sleep 1
  done
  echo "El Postgres de test no arrancó" >&2
  return 1
}

check_python() {
  docker run --rm -m "${PYTHON_MEMORY_LIMIT}" --network "${NETWORK}" \
    -v "${PWD}:/repo" -w /repo \
    -v labrecha-quality-venv:/venv -v labrecha-quality-uv-cache:/uvcache \
    -e UV_CACHE_DIR=/uvcache -e VIRTUAL_ENV=/venv -e PATH=/venv/bin:/usr/local/bin:/usr/bin:/bin \
    -e MYPY_CACHE_DIR=/tmp/mypy -e RUFF_CACHE_DIR=/tmp/ruff -e COVERAGE_FILE=/tmp/coverage \
    -e REQUIRE_TEST_DATABASE=1 \
    -e TEST_DATABASE_URL="postgresql+psycopg2://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_CONTAINER}:5432/labrecha_test" \
    -e HOST_OWNER="${HOST_OWNER}" \
    "${UV_IMAGE}" sh -c '
      set -e
      trap "chown -R ${HOST_OWNER} shared api-py scraper" EXIT
      [ -x /venv/bin/python ] || uv venv --quiet /venv
      uv pip install --quiet -e shared -e "api-py[dev]" -e scraper ruff mypy pytest-cov
      ruff format --check .
      ruff check .
      mypy
      python -m pytest -q -p no:cacheprovider api-py/tests
    '
}

bash ../dotfiles/quality/sync.sh . --check
pnpm --dir web run verify

trap remove_database EXIT
start_database
check_python

git ls-files -z '*.sh' | xargs -0 docker run --rm -m 256m -v "${PWD}:/mnt:ro" -w /mnt "${SHELLCHECK_IMAGE}"
