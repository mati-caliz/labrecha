from __future__ import annotations

import csv
import html
import io
import json
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from labrecha_db import CongressVote, CongressVoteSummary
from labrecha_scraper.base import Connector, upsert_rows
from labrecha_scraper.connectors.hcdn_ckan import (
    LARGE_DOWNLOAD_TIMEOUT_SECONDS,
    fetch_package_resources,
    find_resource_url,
)
from labrecha_scraper.db import SessionLocal
from labrecha_scraper.llm import run_claude_json_array

PROJECTS_DATASET = "proyectos-parlamentarios"
CSV_FORMAT = "CSV"

MAX_VOTES_PER_RUN = 40
BATCH_SIZE = 5
# Las votaciones que no se pudieron resumir quedan marcadas con summary NULL; se vuelven a
# intentar recién pasado este plazo, por si HCDN publicó el proyecto después de la votación.
RETRY_UNRESOLVED_AFTER_DAYS = 30
MAX_FILES_PER_VOTE = 5
MAX_PROJECT_TITLE_LENGTH = 300
NOT_AVAILABLE = "NA"
FILE_SEPARATOR = ", "

TOPICS = {
    "economia",
    "impuestos",
    "laboral",
    "salud",
    "educacion",
    "seguridad",
    "justicia",
    "institucional",
    "derechos",
    "ambiente",
    "internacional",
    "otro",
}
DEFAULT_TOPIC = "otro"

FILE_REFERENCE = re.compile(r"(\d{1,5})\s*-\s*([A-Za-z.]{1,4})\s*-\s*(\d{2,4})")
CENTURY_PIVOT = 50
SHORT_YEAR_LIMIT = 100


@dataclass
class PendingVote:
    vote_record_id: str
    title: str
    file_numbers: list[str]
    project_titles: list[str] = field(default_factory=list)


def _file_key(number: str, chamber: str, year: str) -> str:
    parsed_year = int(year)
    if parsed_year < SHORT_YEAR_LIMIT:
        parsed_year += 2000 if parsed_year < CENTURY_PIVOT else 1900
    return f"{int(number)}-{chamber.replace('.', '').upper()}-{parsed_year}"


def _file_keys_in(title: str) -> list[str]:
    keys: list[str] = []
    for number, chamber, year in FILE_REFERENCE.findall(title):
        key = _file_key(number, chamber, year)
        if key not in keys:
            keys.append(key)
    return keys[:MAX_FILES_PER_VOTE]


def _clean_project_title(value: str) -> str:
    return html.unescape(value.strip())[:MAX_PROJECT_TITLE_LENGTH]


def _build_prompt(batch: list[PendingVote]) -> str:
    payload = [
        {
            "vote_record_id": pending.vote_record_id,
            "titulo_acta": pending.title,
            "proyectos": pending.project_titles,
        }
        for pending in batch
    ]
    topics = "|".join(sorted(TOPICS))
    return (
        "Sos un periodista de datos que explica al ciudadano común qué se votó en la Cámara de "
        "Diputados de Argentina. Para cada votación te paso el título del acta (suele ser "
        "burocrático, del estilo 'Expediente 0073-S-2019 - Votación en General') y los títulos "
        "oficiales de los expedientes involucrados. Escribí un resumen de UNA sola oración, en "
        "español neutro y lenguaje llano, que diga qué se estaba votando y a quién afecta. Sin "
        "jerga parlamentaria, sin repetir el número de expediente, sin opinar ni interpretar "
        "intenciones políticas, y sin inventar nada que no esté en los datos que te paso. Si los "
        "títulos oficiales no alcanzan para saber de qué se trata, devolvé el resumen vacío. "
        "Devolvé SOLO un array JSON, sin texto adicional ni backticks, con un objeto por votación "
        'en el MISMO orden, con esta forma: {"vote_record_id": "<id>", '
        f'"resumen": "<una oración>", "tema": "{topics}"}}. Votaciones:\n'
        + json.dumps(payload, ensure_ascii=False)
    )


class CongressSummariesConnector(Connector[list[dict[str, Any]]]):
    name = "congress_summaries"
    source = "hcdn"
    min_rows = 0

    def fetch(self) -> list[dict[str, Any]]:
        pending = self._pending_votes()
        if not pending:
            return []
        if any(vote.file_numbers for vote in pending):
            with self.build_client() as client:
                titles_by_file = self._download_project_titles(client)
            for vote in pending:
                vote.project_titles = [
                    titles_by_file[key] for key in vote.file_numbers if key in titles_by_file
                ]
        return self._summarize(pending)

    def persist(self, session: Session, data: list[dict[str, Any]]) -> int:
        return upsert_rows(session, CongressVoteSummary, data, ["vote_record_id"])

    def _pending_votes(self) -> list[PendingVote]:
        retry_before = datetime.now(UTC) - timedelta(days=RETRY_UNRESOLVED_AFTER_DAYS)
        statement = (
            select(CongressVote.vote_record_id, CongressVote.title)
            .outerjoin(
                CongressVoteSummary,
                CongressVoteSummary.vote_record_id == CongressVote.vote_record_id,
            )
            .where(
                or_(
                    CongressVoteSummary.vote_record_id.is_(None),
                    (CongressVoteSummary.summary.is_(None))
                    & (CongressVoteSummary.generated_at < retry_before),
                ),
                CongressVote.title.is_not(None),
            )
            .order_by(CongressVote.date.desc().nullslast(), CongressVote.vote_record_id.desc())
            .limit(MAX_VOTES_PER_RUN)
        )
        with SessionLocal() as session:
            rows = session.execute(statement).all()
        return [
            PendingVote(
                vote_record_id=vote_record_id,
                title=title,
                file_numbers=_file_keys_in(title),
            )
            for vote_record_id, title in rows
            if title is not None
        ]

    def _download_project_titles(self, client: httpx.Client) -> dict[str, str]:
        resources = fetch_package_resources(client, PROJECTS_DATASET)
        url = find_resource_url(resources, PROJECTS_DATASET, CSV_FORMAT)
        download = client.get(url, timeout=LARGE_DOWNLOAD_TIMEOUT_SECONDS)
        download.raise_for_status()
        reader = csv.DictReader(io.StringIO(download.content.decode("utf-8-sig")))
        titles_by_file: dict[str, str] = {}
        for record in reader:
            title = record.get("TITULO")
            if not title:
                continue
            for column in ("EXP_DIPUTADOS", "EXP_SENADO"):
                reference = (record.get(column) or "").strip()
                if not reference or reference == NOT_AVAILABLE:
                    continue
                match = FILE_REFERENCE.fullmatch(reference)
                if match is None:
                    continue
                titles_by_file.setdefault(_file_key(*match.groups()), _clean_project_title(title))
        return titles_by_file

    def _summarize(self, pending: list[PendingVote]) -> list[dict[str, Any]]:
        # Toda votación intentada se persiste: la que no se pudo resumir queda con summary
        # NULL para no volver a ocupar la ventana de la próxima corrida.
        attempted_at = datetime.now(UTC)
        rows = {
            vote.vote_record_id: {
                "vote_record_id": vote.vote_record_id,
                "summary": None,
                "topic": None,
                "file_numbers": FILE_SEPARATOR.join(vote.file_numbers) or None,
                "generated_at": attempted_at,
            }
            for vote in pending
        }

        summarizable = [vote for vote in pending if vote.project_titles]
        for start in range(0, len(summarizable), BATCH_SIZE):
            batch = summarizable[start : start + BATCH_SIZE]
            results = run_claude_json_array(_build_prompt(batch))
            by_id = {
                str(item.get("vote_record_id")): item for item in results if isinstance(item, dict)
            }
            for vote in batch:
                item = by_id.get(vote.vote_record_id)
                if item is None:
                    continue
                summary = str(item.get("resumen") or "").strip()
                if not summary:
                    continue
                topic = str(item.get("tema") or "").strip().lower()
                rows[vote.vote_record_id]["summary"] = summary
                rows[vote.vote_record_id]["topic"] = topic if topic in TOPICS else DEFAULT_TOPIC
        return list(rows.values())
