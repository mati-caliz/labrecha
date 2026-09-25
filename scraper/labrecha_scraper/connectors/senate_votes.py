from __future__ import annotations

import hashlib
import re
import time
from dataclasses import dataclass, field
from datetime import date
from functools import partial
from typing import Any

import httpx
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from labrecha_db import CHAMBER_SENATE, CongressVote, CongressVoteDetail
from labrecha_scraper.base import Connector, upsert_rows
from labrecha_scraper.clock import today_in_argentina
from labrecha_scraper.config import settings
from labrecha_scraper.db import SessionLocal
from labrecha_scraper.http_client import InvalidResponseError, retry_invalid_response

ACTAS_URL = "https://www.senado.gob.ar/votaciones/actas"
DETAIL_URL = "https://www.senado.gob.ar/votaciones/detalleActa/{acta_id}"
YEAR_FIELD = "busqueda_actas[anio]"

# El Senado publica actas nominales desde 1993; abajo de ese piso el buscador devuelve
# páginas vacías para siempre y el backfill no tendría dónde detenerse.
EARLIEST_YEAR = 1993
# Un año son ~100 actas y cada una es un request al detalle, así que se completa un año
# entero por corrida: run_job commitea una sola vez, de modo que un año queda cargado
# completo o no queda nada y se reintenta.
MAX_DETAILS_PER_RUN = 250
PAUSE_BETWEEN_REQUESTS_SECONDS = 1.0

TAG = re.compile(r"<[^>]+>")
WHITESPACE = re.compile(r"\s+")
SPACE_BEFORE_COMMA = re.compile(r"\s+,")
TABLE_BODY = "<tbody"
ROW = re.compile(r"<tr>(.*?)</tr>", re.DOTALL)
CELL = re.compile(r"<td[^>]*>(.*?)</td>", re.DOTALL)
DETAIL_LINK = re.compile(r"/votaciones/detalleActa/(\d+)")
SORTABLE_DATE = re.compile(r'<span style="display:none">(\d{4})(\d{2})(\d{2})</span>')

BALLOT_NUMBER = re.compile(r"Acta\s+Nro:\s*(\d+)", re.IGNORECASE)
MOMENT = re.compile(r"(\d{2})/(\d{2})/(\d{4})\s*-\s*(\d{2}:\d{2})")
COUNT = re.compile(r"<h3[^>]*>\s*(\d+)\s*</h3>\s*<h4[^>]*>\s*([A-ZÁÉÍÓÚÑ]+)\s*</h4>", re.IGNORECASE)
RESULT_COLUMN = re.compile(
    r'<div class="col-lg-6 col-sm-6"[^>]*>(.*?)<div class="row row-in"', re.DOTALL
)
PARAGRAPH = re.compile(r"<p[^>]*>(.*?)</p>", re.DOTALL)
TITLE_PARAGRAPH = re.compile(r'<p style="font-size: 18px[^"]*"[^>]*>(.*?)</p>', re.DOTALL)
MAJORITY_TYPE = re.compile(r"<SPAN[^>]*>\s*([A-ZÁÉÍÓÚÑ ]+?)\s*</SPAN>", re.IGNORECASE)
SENATOR_LINK = re.compile(r"/senadores/senador/(\d+)")
NAME_KEY_BYTES = 4

AFFIRMATIVE_LABEL = "AFIRMATIVOS"
NEGATIVE_LABEL = "NEGATIVOS"
ABSTENTION_LABEL = "ABSTENCIONES"
ABSENT_LABEL = "AUSENTES"
COUNT_LABELS = (AFFIRMATIVE_LABEL, NEGATIVE_LABEL, ABSTENTION_LABEL, ABSENT_LABEL)
SENATOR_CELLS = 5
NAME_CELL = 1
BLOC_CELL = 2
PROVINCE_CELL = 3
VOTE_CELL = 4


@dataclass
class SenateVotesData:
    votes: list[dict[str, Any]] = field(default_factory=list)
    details: list[dict[str, Any]] = field(default_factory=list)


def _record_id(acta_id: str) -> str:
    return f"S-{acta_id}"


def _flatten(fragment: str) -> str:
    return SPACE_BEFORE_COMMA.sub(",", WHITESPACE.sub(" ", TAG.sub(" ", fragment))).strip()


def _text(fragment: str) -> str | None:
    flattened = _flatten(fragment)
    return flattened or None


def _name_key(name: str) -> str:
    return f"n{hashlib.blake2s(name.encode('utf-8'), digest_size=NAME_KEY_BYTES).hexdigest()}"


def _senator_key(photo_cell: str, name: str | None, position: int) -> str:
    senator = SENATOR_LINK.search(photo_cell)
    if senator:
        return senator.group(1)
    if name:
        return _name_key(name)
    return f"p{position}"


def _same_senator_vote(one: dict[str, Any], other: dict[str, Any]) -> bool:
    return all(
        one[column] == other[column] for column in ("legislator_name", "bloc", "district", "vote")
    )


class SenateVotesConnector(Connector[SenateVotesData]):
    name = "senate_votes"
    source = "senado"
    min_rows = 0

    def fetch(self) -> SenateVotesData:
        years, loaded_record_ids = self._pending_scope()
        data = SenateVotesData()
        with self.build_client() as client:
            for year in years:
                actas = retry_invalid_response(
                    partial(self._download_and_parse_listing, client, year),
                    source=ACTAS_URL,
                    max_attempts=settings.http_max_attempts,
                )
                for acta_id, session_date in actas:
                    if len(data.votes) >= MAX_DETAILS_PER_RUN:
                        return data
                    if _record_id(acta_id) in loaded_record_ids:
                        continue
                    time.sleep(PAUSE_BETWEEN_REQUESTS_SECONDS)
                    detail = self._download_detail(client, acta_id)
                    data.votes.append(self._parse_vote(detail, acta_id, session_date))
                    data.details.extend(self._parse_senator_votes(detail, acta_id))
        return data

    def persist(self, session: Session, data: SenateVotesData) -> int:
        votes = upsert_rows(session, CongressVote, data.votes, ["vote_record_id"])
        details = upsert_rows(session, CongressVoteDetail, data.details, ["vote_detail_id"])
        return votes + details

    def _pending_scope(self) -> tuple[list[int], set[str]]:
        loaded = select(CongressVote).where(CongressVote.chamber == CHAMBER_SENATE)
        with SessionLocal() as session:
            oldest_year = session.scalar(
                select(func.min(func.extract("year", CongressVote.date))).where(
                    CongressVote.chamber == CHAMBER_SENATE
                )
            )
            record_ids = set(
                session.scalars(loaded.with_only_columns(CongressVote.vote_record_id)).all()
            )

        # El año en curso se revisa siempre porque le siguen entrando actas; el backfill
        # camina un año por corrida hacia atrás desde el más viejo ya cargado.
        current_year = today_in_argentina().year
        years = [current_year]
        backfill_year = current_year - 1 if oldest_year is None else int(oldest_year) - 1
        if EARLIEST_YEAR <= backfill_year < current_year:
            years.append(backfill_year)
        return years, record_ids

    def _download_and_parse_listing(
        self, client: httpx.Client, year: int
    ) -> list[tuple[str, date]]:
        return self._parse_listing(self._download_listing(client, year), year)

    def _download_listing(self, client: httpx.Client, year: int) -> str:
        response = client.post(ACTAS_URL, data={YEAR_FIELD: str(year)})
        response.raise_for_status()
        return response.text

    def _download_detail(self, client: httpx.Client, acta_id: str) -> str:
        response = client.get(DETAIL_URL.format(acta_id=acta_id))
        response.raise_for_status()
        return response.text

    def _parse_listing(self, html: str, year: int) -> list[tuple[str, date]]:
        body = html.find(TABLE_BODY)
        if body < 0:
            raise InvalidResponseError(
                f"el listado de actas del Senado {year} no trae tabla de resultados"
            )
        actas: list[tuple[str, date]] = []
        for row in ROW.findall(html[body:]):
            link = DETAIL_LINK.search(row)
            stamp = SORTABLE_DATE.search(row)
            if link is None or stamp is None:
                continue
            actas.append((link.group(1), date(*(int(part) for part in stamp.groups()))))
        return actas

    def _parse_vote(self, html: str, acta_id: str, session_date: date) -> dict[str, Any]:
        counts = {label.upper(): int(value) for value, label in COUNT.findall(html)}
        missing = [label for label in COUNT_LABELS if label not in counts]
        if missing:
            raise ValueError(f"acta {acta_id} del Senado sin conteo de {', '.join(missing)}")

        column = RESULT_COLUMN.search(html)
        if column is None:
            raise ValueError(f"acta {acta_id} del Senado sin bloque de resultado")
        paragraphs = [text for text in map(_text, PARAGRAPH.findall(column.group(1))) if text]
        if not paragraphs:
            raise ValueError(f"acta {acta_id} del Senado sin resultado declarado")

        ballot_number = BALLOT_NUMBER.search(html)
        moment = MOMENT.search(html)
        title = TITLE_PARAGRAPH.search(html)
        # La mayoría requerida es el SPAN que sigue al de la fecha, en la misma columna.
        majority_type = MAJORITY_TYPE.search(html, moment.end()) if moment else None
        return {
            "vote_record_id": _record_id(acta_id),
            "chamber": CHAMBER_SENATE,
            "session_source_id": None,
            "period_number": None,
            "period_type": None,
            "session_type": None,
            "meeting_number": None,
            "session_number": None,
            "ballot_number": ballot_number.group(1) if ballot_number else None,
            "date": session_date,
            "time": moment.group(4) if moment else None,
            "majority_base": None,
            "majority_type": _text(majority_type.group(1)) if majority_type else None,
            "title": _text(title.group(1)) if title else None,
            "vote_type": paragraphs[1] if len(paragraphs) > 1 else None,
            "result": paragraphs[0],
            "president_name": None,
            "affirmative_votes": counts[AFFIRMATIVE_LABEL],
            "negative_votes": counts[NEGATIVE_LABEL],
            "abstentions": counts[ABSTENTION_LABEL],
            "absents": counts[ABSENT_LABEL],
        }

    def _parse_senator_votes(self, html: str, acta_id: str) -> list[dict[str, Any]]:
        body = html.find(TABLE_BODY)
        if body < 0:
            raise ValueError(f"acta {acta_id} del Senado sin tabla de votos por senador")
        rows: list[dict[str, Any]] = []
        seen: dict[str, dict[str, Any]] = {}
        for position, row in enumerate(ROW.findall(html[body:])):
            cells = CELL.findall(row)
            if len(cells) < SENATOR_CELLS:
                continue
            name = _text(cells[NAME_CELL])
            key = _senator_key(cells[0], name, position)
            senator_vote = {
                "vote_detail_id": f"{_record_id(acta_id)}-{key}",
                "vote_record_id": _record_id(acta_id),
                "legislator_name": name,
                "bloc": _text(cells[BLOC_CELL]),
                "district": _text(cells[PROVINCE_CELL]),
                "vote": _text(cells[VOTE_CELL]),
            }
            previous = seen.get(key)
            if previous is not None:
                if _same_senator_vote(previous, senator_vote):
                    continue
                key = _name_key(f"{name}#{position}")
                senator_vote["vote_detail_id"] = f"{_record_id(acta_id)}-{key}"
            else:
                seen[key] = senator_vote
            rows.append(senator_vote)
        if not rows:
            raise ValueError(f"acta {acta_id} del Senado sin votos por senador")
        return rows
