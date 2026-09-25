from __future__ import annotations

import html
import json
from dataclasses import dataclass, field
from datetime import date
from typing import Any

import httpx
from sqlalchemy.orm import Session

from labrecha_db import SanctionedLaw
from labrecha_scraper.base import Connector, upsert_rows
from labrecha_scraper.connectors.hcdn_ckan import (
    LARGE_DOWNLOAD_TIMEOUT_SECONDS,
    fetch_package_resources,
    find_resource_url,
)

SANCTIONED_DATASET = "leyes-sancionadas"
SUMMARY_DATASET = "leyes-sumario"
PROJECTS_DATASET = "proyectos-parlamentarios"
JSON_FORMAT = "JSON"

BOM = "\ufeff"


@dataclass
class LawsData:
    laws: list[dict[str, Any]] = field(default_factory=list)


def _normalize_keys(record: dict[str, Any]) -> dict[str, Any]:
    return {key.lstrip(BOM): value for key, value in record.items()}


def _text(value: object) -> str | None:
    if value is None:
        return None
    stripped = str(value).strip()
    return stripped or None


def _clean_title(value: object) -> str | None:
    text = _text(value)
    return html.unescape(text) if text is not None else None


def _parse_date(value: object) -> date | None:
    text = _text(value)
    if text is None:
        return None
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        return None


class LawsConnector(Connector[LawsData]):
    name = "laws"
    source = "hcdn"

    def fetch(self) -> LawsData:
        with self.build_client() as client:
            sanctioned = self._download_records(client, SANCTIONED_DATASET)
            summaries = self._download_records(client, SUMMARY_DATASET)
            projects = self._download_records(client, PROJECTS_DATASET)

            summary_by_law: dict[str, dict[str, Any]] = {}
            for record in summaries:
                law_number = _text(record.get("ley"))
                if law_number is not None:
                    summary_by_law[law_number] = record

            title_by_project: dict[str, str] = {}
            for record in projects:
                project_id = _text(record.get("PROYECTO_ID"))
                title = _clean_title(record.get("TITULO"))
                if project_id is not None and title is not None:
                    title_by_project[project_id] = title

            return LawsData(laws=self._map_laws(sanctioned, summary_by_law, title_by_project))

    def persist(self, session: Session, data: LawsData) -> int:
        return upsert_rows(session, SanctionedLaw, data.laws, ["law_number"])

    def _download_records(self, client: httpx.Client, dataset_id: str) -> list[dict[str, Any]]:
        resources = fetch_package_resources(client, dataset_id)
        url = find_resource_url(resources, dataset_id, JSON_FORMAT)
        response = client.get(url, timeout=LARGE_DOWNLOAD_TIMEOUT_SECONDS)
        response.raise_for_status()
        payload = json.loads(response.content.decode("utf-8-sig"))
        records = payload if isinstance(payload, list) else list(payload.values())
        return [_normalize_keys(record) for record in records if isinstance(record, dict)]

    def _map_laws(
        self,
        sanctioned: list[dict[str, Any]],
        summary_by_law: dict[str, dict[str, Any]],
        title_by_project: dict[str, str],
    ) -> list[dict[str, Any]]:
        rows_by_law: dict[str, dict[str, Any]] = {}
        for record in sanctioned:
            law_number = _text(record.get("LEY"))
            if law_number is None:
                continue
            project_id = _text(record.get("PROYECTO_ID"))
            summary_record = summary_by_law.get(law_number, {})
            title = title_by_project.get(project_id or "") or _clean_title(
                summary_record.get("titulo")
            )
            rows_by_law[law_number] = {
                "law_number": law_number,
                "project_id": project_id,
                "sanctioning_chamber": _text(record.get("CAMARA_SANCIONADORA")),
                "initial_file": _text(record.get("EXPEDIENTE_INICIAL")),
                "first_half_sanction": _parse_date(record.get("PRIMERA_MEDIA_SANCION")),
                "second_half_sanction": _parse_date(record.get("SEGUNDA_MEDIA_SANCION")),
                "final_sanction": _parse_date(record.get("SANCION_DEFINITIVA")),
                "title": title,
                "summary": _text(summary_record.get("sumario")),
            }
        return list(rows_by_law.values())
