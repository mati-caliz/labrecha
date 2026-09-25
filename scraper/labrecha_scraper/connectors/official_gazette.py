from __future__ import annotations

import html
import json
import re
from dataclasses import dataclass, field
from datetime import date
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from labrecha_db import GazetteSummary, TaxChange
from labrecha_scraper.base import Connector, upsert_rows
from labrecha_scraper.clock import today_in_argentina
from labrecha_scraper.db import SessionLocal
from labrecha_scraper.llm import run_claude_json_array

TAX_CHANGE_TYPES = {"alta", "baja", "modificacion"}
TAX_JURISDICTIONS = {"nacional", "provincial", "municipal"}

BASE_URL = "https://www.boletinoficial.gob.ar"
SECTION = "primera"
MAX_NOTICES_PER_RUN = 12
BATCH_SIZE = 4
TEXT_TRUNCATE = 1500
BODY_MARKER = "Ver texto del aviso"

NOTICE_LINK = re.compile(rf"/detalleAviso/{SECTION}/(\d+)/(\d{{8}})")
TITLE_TAG = re.compile(r"<title>(.*?)</title>", re.IGNORECASE | re.DOTALL)
TAG = re.compile(r"<[^>]+>")
SCRIPT_STYLE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.IGNORECASE | re.DOTALL)
WHITESPACE = re.compile(r"\s+")


@dataclass
class Notice:
    regulation_id: str
    date: date
    url: str
    title: str
    body: str


@dataclass
class GazetteData:
    summaries: list[dict[str, Any]] = field(default_factory=list)
    tax_changes: list[dict[str, Any]] = field(default_factory=list)


def _clean(raw_html: str) -> str:
    text = SCRIPT_STYLE.sub("", raw_html)
    text = TAG.sub(" ", text)
    return html.unescape(WHITESPACE.sub(" ", text)).strip()


TITLE_PREFIX = "BOLETIN OFICIAL REPUBLICA ARGENTINA - "


def _title(raw_html: str) -> str:
    match = TITLE_TAG.search(raw_html)
    if not match:
        return "Aviso del Boletín Oficial"
    title = html.unescape(match.group(1).strip())
    return title.removeprefix(TITLE_PREFIX)


def _body(clean_text: str) -> str:
    index = clean_text.find(BODY_MARKER)
    body = clean_text[index + len(BODY_MARKER) :] if index != -1 else clean_text
    return body.strip()[:TEXT_TRUNCATE]


def _build_prompt(batch: list[Notice]) -> str:
    payload = [
        {"regulation_id": notice.regulation_id, "titulo": notice.title, "texto": notice.body}
        for notice in batch
    ]
    return (
        "Sos un analista que resume normas del Boletín Oficial argentino para un observatorio "
        "económico. Para cada norma decidí si es RELEVANTE para el ciudadano común en materia "
        "económica/regulatoria (impuestos, alícuotas, regulaciones, política monetaria, tarifas, "
        "subsidios, empleo). Descartá lo puramente administrativo, designaciones y trámites "
        "internos. "
        "Devolvé SOLO un array JSON, sin texto adicional ni backticks, con un objeto por norma "
        "en el "
        'MISMO orden, con esta forma: {"regulation_id": "<id>", "relevante": true|false, '
        '"categoria": "impuesto|regulacion|monetario|laboral|subsidio|tarifa|otro", '
        '"resumen": ["viñeta 1", "viñeta 2", "viñeta 3"], '
        '"cambio_impositivo": true|false, "tipo_cambio": "alta|baja|modificacion", '
        '"tributo": "<nombre corto del impuesto/tasa/contribución afectado>", '
        '"jurisdiccion": "nacional|provincial|municipal"}. Marcá "cambio_impositivo" en true '
        "SOLO si la norma CREA (alta), DEROGA/ELIMINA (baja) o MODIFICA una alícuota/base "
        "(modificacion) de un tributo concreto; en ese caso completá tributo y jurisdiccion. "
        'Si no es un cambio de un tributo puntual, poné "cambio_impositivo": false y dejá los '
        "otros campos vacíos. El resumen debe tener "
        "3 viñetas claras y cortas en español. Normas:\n" + json.dumps(payload, ensure_ascii=False)
    )


class OfficialGazetteConnector(Connector[GazetteData]):
    name = "official_gazette"
    source = "official_gazette"
    min_rows = 0

    def fetch(self) -> GazetteData:
        target_date = today_in_argentina()
        with self.build_client() as client:
            notices = self._list_notices(client, target_date)
            pending = self._filter_pending(notices)[:MAX_NOTICES_PER_RUN]
            for notice in pending:
                self._load_body(client, notice)
        summaries, tax_changes = self._summarize(pending)
        return GazetteData(summaries=summaries, tax_changes=tax_changes)

    def persist(self, session: Session, data: GazetteData) -> int:
        summaries = upsert_rows(
            session, GazetteSummary, data.summaries, ["regulation_id"], update_on_conflict=False
        )
        changes = upsert_rows(
            session, TaxChange, data.tax_changes, ["regulation_id"], update_on_conflict=False
        )
        return summaries + changes

    def _list_notices(self, client: httpx.Client, target_date: date) -> list[Notice]:
        response = client.get(f"{BASE_URL}/seccion/{SECTION}")
        response.raise_for_status()
        seen: set[str] = set()
        notices: list[Notice] = []
        for regulation_id, date_token in NOTICE_LINK.findall(response.text):
            if regulation_id in seen:
                continue
            seen.add(regulation_id)
            notices.append(
                Notice(
                    regulation_id=regulation_id,
                    date=target_date,
                    url=f"{BASE_URL}/detalleAviso/{SECTION}/{regulation_id}/{date_token}",
                    title="",
                    body="",
                )
            )
        return notices

    def _filter_pending(self, notices: list[Notice]) -> list[Notice]:
        ids = [notice.regulation_id for notice in notices]
        if not ids:
            return []
        with SessionLocal() as session:
            existing = set(
                session.scalars(
                    select(GazetteSummary.regulation_id).where(
                        GazetteSummary.regulation_id.in_(ids)
                    )
                ).all()
            )
        return [notice for notice in notices if notice.regulation_id not in existing]

    def _load_body(self, client: httpx.Client, notice: Notice) -> None:
        response = client.get(notice.url)
        response.raise_for_status()
        notice.title = _title(response.text)
        notice.body = _body(_clean(response.text))

    def _summarize(
        self, notices: list[Notice]
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        summaries: list[dict[str, Any]] = []
        tax_changes: list[dict[str, Any]] = []
        for start in range(0, len(notices), BATCH_SIZE):
            batch = notices[start : start + BATCH_SIZE]
            results = run_claude_json_array(_build_prompt(batch))
            by_id = {
                str(item.get("regulation_id")): item for item in results if isinstance(item, dict)
            }
            for notice in batch:
                item = by_id.get(notice.regulation_id)
                if item is None or not item.get("relevante"):
                    continue
                bullets = [
                    str(bullet).strip() for bullet in item.get("resumen", []) if str(bullet).strip()
                ]
                if not bullets:
                    continue
                summaries.append(
                    {
                        "regulation_id": notice.regulation_id,
                        "date": notice.date,
                        "section": SECTION,
                        "title": notice.title,
                        "summary": "\n".join(bullets),
                        "category": str(item.get("categoria") or "otro"),
                        "url": notice.url,
                    }
                )
                tax_change = self._build_tax_change(notice, item)
                if tax_change is not None:
                    tax_changes.append(tax_change)
        return summaries, tax_changes

    def _build_tax_change(self, notice: Notice, item: dict[str, Any]) -> dict[str, Any] | None:
        if not item.get("cambio_impositivo"):
            return None
        change_type = str(item.get("tipo_cambio") or "").strip().lower()
        jurisdiction = str(item.get("jurisdiccion") or "").strip().lower()
        tax_name = str(item.get("tributo") or "").strip()
        if change_type not in TAX_CHANGE_TYPES or not tax_name:
            return None
        if jurisdiction not in TAX_JURISDICTIONS:
            jurisdiction = "otro"
        return {
            "regulation_id": notice.regulation_id,
            "date": notice.date,
            "change_type": change_type,
            "tax_name": tax_name,
            "jurisdiction": jurisdiction,
            "title": notice.title,
            "url": notice.url,
        }
