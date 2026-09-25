from __future__ import annotations

from datetime import date
from typing import Any

import httpx
from sqlalchemy.orm import Session

from labrecha_db import Senator
from labrecha_scraper.base import Connector, upsert_rows
from labrecha_scraper.config import settings
from labrecha_scraper.http_client import InvalidResponseError, retry_invalid_response

SENATORS_URL = "https://www.senado.gob.ar/micrositios/DatosAbiertos/ExportarListadoSenadores/json"


def _text(value: object) -> str | None:
    if value is None:
        return None
    stripped = str(value).strip()
    if not stripped or stripped.lower() == "sin datos":
        return None
    return stripped


def _parse_date(value: object) -> date | None:
    text = _text(value)
    if text is None:
        return None
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        return None


class SenateConnector(Connector[list[dict[str, Any]]]):
    name = "senate"
    source = "senado"

    def fetch(self) -> list[dict[str, Any]]:
        with self.build_client() as client:
            records = retry_invalid_response(
                lambda: self._download_records(client),
                source=SENATORS_URL,
                max_attempts=settings.http_max_attempts,
            )

        rows: list[dict[str, Any]] = []
        for record in records:
            senator_id = _text(record.get("ID"))
            if senator_id is None:
                continue
            rows.append(
                {
                    "senator_id": senator_id,
                    "last_name": _text(record.get("APELLIDO")),
                    "first_name": _text(record.get("NOMBRE")),
                    "bloc": _text(record.get("BLOQUE")),
                    "province": _text(record.get("PROVINCIA")),
                    "party": _text(record.get("PARTIDO O ALIANZA")),
                    "mandate_start": _parse_date(record.get("D_LEGAL")),
                    "mandate_end": _parse_date(record.get("C_LEGAL")),
                    "email": _text(record.get("EMAIL")),
                    "photo_url": _text(record.get("FOTO")),
                }
            )
        return rows

    def _download_records(self, client: httpx.Client) -> list[dict[str, Any]]:
        response = client.get(SENATORS_URL)
        response.raise_for_status()
        try:
            payload = response.json()
        except ValueError as error:
            raise InvalidResponseError("el listado de senadores no es JSON") from error
        if not isinstance(payload, dict):
            raise InvalidResponseError("el listado de senadores no es un objeto")
        table = payload.get("table")
        if not isinstance(table, dict):
            raise InvalidResponseError("el listado de senadores no contiene table")
        records = table.get("rows")
        if not isinstance(records, list) or not records:
            raise InvalidResponseError("el listado de senadores no contiene filas")
        if not all(isinstance(record, dict) for record in records):
            raise InvalidResponseError("el listado de senadores contiene filas invalidas")
        return records

    def persist(self, session: Session, data: list[dict[str, Any]]) -> int:
        return upsert_rows(session, Senator, data, ["senator_id"])
