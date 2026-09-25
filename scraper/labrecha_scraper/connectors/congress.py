from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import date
from typing import Any

import httpx
from sqlalchemy.orm import Session

from labrecha_db import CHAMBER_DEPUTIES, CongressVote, CongressVoteDetail
from labrecha_scraper.base import Connector, upsert_rows
from labrecha_scraper.connectors.hcdn_ckan import (
    LARGE_DOWNLOAD_TIMEOUT_SECONDS,
    fetch_package_resources,
)

DATASET_ID = "votaciones_nominales"
JSON_FORMAT = "JSON"
HEADER_KEYWORD = "cabecera"
DETAIL_KEYWORD = "detalle"


@dataclass
class CongressData:
    votes: list[dict[str, Any]] = field(default_factory=list)
    details: list[dict[str, Any]] = field(default_factory=list)


def _text(value: object) -> str | None:
    if value is None:
        return None
    stripped = str(value).strip()
    return stripped or None


def _integer(value: object) -> int | None:
    text = _text(value)
    if text is None:
        return None
    try:
        return int(text)
    except ValueError:
        return None


def _parse_date(value: object) -> date | None:
    text = _text(value)
    if text is None:
        return None
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        return None


class CongressConnector(Connector[CongressData]):
    name = "congress"
    source = "hcdn"

    def fetch(self) -> CongressData:
        with self.build_client() as client:
            header_urls, detail_urls = self._resolve_resources(client)
            data = CongressData()
            for url in header_urls:
                data.votes.extend(self._map_votes(self._download_json(client, url)))
            for url in detail_urls:
                data.details.extend(self._map_details(self._download_json(client, url)))
            return data

    def persist(self, session: Session, data: CongressData) -> int:
        votes = upsert_rows(session, CongressVote, data.votes, ["vote_record_id"])
        details = upsert_rows(session, CongressVoteDetail, data.details, ["vote_detail_id"])
        return votes + details

    def _resolve_resources(self, client: httpx.Client) -> tuple[list[str], list[str]]:
        resources = fetch_package_resources(client, DATASET_ID)
        header_urls: list[str] = []
        detail_urls: list[str] = []
        for resource in resources:
            if (resource.get("format") or "").upper() != JSON_FORMAT:
                continue
            name = (resource.get("name") or "").lower()
            url = resource.get("url")
            if url is None:
                continue
            if DETAIL_KEYWORD in name:
                detail_urls.append(url)
            elif HEADER_KEYWORD in name:
                header_urls.append(url)
        if not header_urls or not detail_urls:
            raise ValueError("no se encontraron recursos JSON de cabecera y detalle en CKAN")
        return header_urls, detail_urls

    def _download_json(self, client: httpx.Client, url: str) -> dict[str, Any]:
        response = client.get(url, timeout=LARGE_DOWNLOAD_TIMEOUT_SECONDS)
        response.raise_for_status()
        payload: dict[str, Any] = json.loads(response.content.decode("utf-8-sig"))
        return payload

    def _map_votes(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for record in payload.values():
            vote_record_id = _text(record.get("acta_id"))
            if vote_record_id is None:
                continue
            rows.append(
                {
                    "vote_record_id": vote_record_id,
                    "chamber": CHAMBER_DEPUTIES,
                    "session_source_id": _text(record.get("sesion_id")),
                    "period_number": _integer(record.get("nroperiodo")),
                    "period_type": _text(record.get("tipo_periodo")),
                    "session_type": _text(record.get("tipo_sesion")),
                    "meeting_number": _text(record.get("reunion")),
                    "session_number": _text(record.get("sesion")),
                    "ballot_number": _text(record.get("numero")),
                    "date": _parse_date(record.get("fecha")),
                    "time": _text(record.get("hora")),
                    "majority_base": _text(record.get("base_mayoria")),
                    "majority_type": _text(record.get("tipo_mayoria")),
                    "title": _text(record.get("titulo")),
                    "result": _text(record.get("resultado")),
                    "president_name": _text(record.get("presidente_nombre")),
                    "affirmative_votes": _integer(record.get("votos_afirmativos")),
                    "negative_votes": _integer(record.get("votos_negativos")),
                    "abstentions": _integer(record.get("abstenciones")),
                    "absents": _integer(record.get("ausentes")),
                }
            )
        return rows

    def _map_details(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for record in payload.values():
            vote_detail_id = _text(record.get("acta_detalle_id"))
            vote_record_id = _text(record.get("acta_id"))
            if vote_detail_id is None or vote_record_id is None:
                continue
            rows.append(
                {
                    "vote_detail_id": vote_detail_id,
                    "vote_record_id": vote_record_id,
                    "legislator_name": _text(record.get("diputado_nombre")),
                    "bloc": _text(record.get("bloque")),
                    "district": _text(record.get("distrito_nombre")),
                    "vote": _text(record.get("voto")),
                }
            )
        return rows
