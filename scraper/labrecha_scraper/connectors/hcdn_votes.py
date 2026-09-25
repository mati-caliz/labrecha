from __future__ import annotations

import re
import time
from dataclasses import dataclass, field
from datetime import date
from typing import Any

import httpx
from sqlalchemy import Integer, func, select
from sqlalchemy.orm import Session

from labrecha_db import CHAMBER_DEPUTIES, CongressVote, CongressVoteDetail
from labrecha_scraper.base import Connector, upsert_rows
from labrecha_scraper.db import SessionLocal

# El dataset de datos abiertos de HCDN quedó congelado en el acta del 29/01/2020, pero la
# plataforma de votaciones sigue publicando cada acta en /votacion/{acta_id} con el MISMO
# acta_id que traía el dataset. Por eso se sigue la numeración desde la última acta cargada
# en vez de listar: la plataforma arma su listado por JavaScript y no expone el endpoint.
# La API oficial (OpenAPI, /desarrolladores) sería la vía correcta, pero exige un API-KEY
# que HCDN dejó de emitir.
VOTE_URL = "https://votaciones.hcdn.gob.ar/votacion/{acta_id}"

MAX_PROBES_PER_RUN = 60
# Los acta_id no siempre son contiguos: se corta recién después de varios ids seguidos sin
# acta para no dar por terminada la serie en un hueco de numeración.
MAX_CONSECUTIVE_MISSES = 25
PAUSE_BETWEEN_REQUESTS_SECONDS = 1.0
FIRST_ACTA_ID = 1

TAG = re.compile(r"<[^>]+>")
WHITESPACE = re.compile(r"\s+")
TABLE_BODY = "<tbody"
ROW = re.compile(r"<tr>(.*?)</tr>", re.DOTALL)
CELL = re.compile(r"<td[^>]*>(.*?)</td>", re.DOTALL)

HEADING = re.compile(
    r"Per[ií]odo\s+(\d+)\s*-\s*Reuni[oó]n\s+(\S+?)\s*-\s*Acta\s+(\d+)", re.IGNORECASE
)
TITLE_AND_MOMENT = re.compile(r'<h4 class="black-opacity"[^>]*>(.*?)<h5[^>]*>(.*?)</h5>', re.DOTALL)
MOMENT = re.compile(r"(\d{2})/(\d{2})/(\d{4})\s*-\s*(\d{2}:\d{2})")
PRESIDENT = re.compile(r"Presidida por\s*<b>(.*?)</b>", re.DOTALL)
RESULT = re.compile(
    r'<h3 style="color:[^"]*">\s*(.*?)\s*</h3>\s*(?:<h5[^>]*>(.*?)</h5>)?', re.DOTALL
)
COUNT = re.compile(r"<h3[^>]*>\s*(\d+)\s*</h3>.*?<h4[^>]*>\s*([A-ZÁÉÍÓÚÑ]+)\s*</h4>", re.DOTALL)
DEPUTY_KEY = re.compile(r'id="container-([A-Za-z0-9]+)"')

MAJORITY_SEPARATOR = " - "
AFFIRMATIVE_LABEL = "AFIRMATIVOS"
NEGATIVE_LABEL = "NEGATIVOS"
ABSTENTION_LABEL = "ABSTENCIONES"
ABSENT_LABEL = "AUSENTES"
COUNT_LABELS = (AFFIRMATIVE_LABEL, NEGATIVE_LABEL, ABSTENTION_LABEL, ABSENT_LABEL)
DEPUTY_CELLS = 5
NAME_CELL = 1
BLOC_CELL = 2
DISTRICT_CELL = 3
VOTE_CELL = 4


@dataclass
class HcdnVotesData:
    votes: list[dict[str, Any]] = field(default_factory=list)
    details: list[dict[str, Any]] = field(default_factory=list)


def _flatten(fragment: str) -> str:
    return WHITESPACE.sub(" ", TAG.sub(" ", fragment)).strip()


def _text(fragment: str) -> str | None:
    flattened = _flatten(fragment)
    return flattened or None


def _deputy_key(photo_cell: str, position: int) -> str:
    deputy = DEPUTY_KEY.search(photo_cell)
    return deputy.group(1) if deputy else f"p{position}"


class HcdnVotesConnector(Connector[HcdnVotesData]):
    name = "hcdn_votes"
    source = "hcdn"
    min_rows = 0

    def fetch(self) -> HcdnVotesData:
        acta_id = self._next_acta_id()
        data = HcdnVotesData()
        misses = 0
        with self.build_client() as client:
            for probe in range(MAX_PROBES_PER_RUN):
                if misses >= MAX_CONSECUTIVE_MISSES:
                    break
                if probe:
                    time.sleep(PAUSE_BETWEEN_REQUESTS_SECONDS)
                page = self._download_vote(client, acta_id)
                if page is None:
                    misses += 1
                else:
                    misses = 0
                    data.votes.append(self._parse_vote(page, acta_id))
                    data.details.extend(self._parse_deputy_votes(page, acta_id))
                acta_id += 1
        return data

    def persist(self, session: Session, data: HcdnVotesData) -> int:
        votes = upsert_rows(session, CongressVote, data.votes, ["vote_record_id"])
        details = upsert_rows(session, CongressVoteDetail, data.details, ["vote_detail_id"])
        return votes + details

    def _next_acta_id(self) -> int:
        statement = select(func.max(func.cast(CongressVote.vote_record_id, Integer))).where(
            CongressVote.chamber == CHAMBER_DEPUTIES
        )
        with SessionLocal() as session:
            last_loaded = session.scalar(statement)
        return FIRST_ACTA_ID if last_loaded is None else int(last_loaded) + 1

    def _download_vote(self, client: httpx.Client, acta_id: int) -> str | None:
        response = client.get(VOTE_URL.format(acta_id=acta_id))
        if response.status_code == httpx.codes.NOT_FOUND:
            return None
        response.raise_for_status()
        # Un acta inexistente puede volver como 200 con la pantalla de búsqueda: sin
        # encabezado de acta no hay nada que guardar.
        return response.text if HEADING.search(response.text) else None

    def _parse_vote(self, html: str, acta_id: int) -> dict[str, Any]:
        heading = HEADING.search(html)
        if heading is None:
            raise ValueError(f"acta {acta_id} de Diputados sin encabezado de período/reunión")

        counts = {label.upper(): int(value) for value, label in COUNT.findall(html)}
        missing = [label for label in COUNT_LABELS if label not in counts]
        if missing:
            raise ValueError(f"acta {acta_id} de Diputados sin conteo de {', '.join(missing)}")

        result = RESULT.search(html)
        if result is None:
            raise ValueError(f"acta {acta_id} de Diputados sin resultado declarado")

        title_and_moment = TITLE_AND_MOMENT.search(html)
        moment = MOMENT.search(title_and_moment.group(2)) if title_and_moment else None
        if moment is None:
            raise ValueError(f"acta {acta_id} de Diputados sin fecha de votación")

        president = PRESIDENT.search(html)
        majority_type, _, majority_base = _flatten(result.group(2) or "").partition(
            MAJORITY_SEPARATOR
        )
        return {
            "vote_record_id": str(acta_id),
            "chamber": CHAMBER_DEPUTIES,
            "session_source_id": None,
            "period_number": int(heading.group(1)),
            "period_type": None,
            "session_type": None,
            "meeting_number": heading.group(2),
            "session_number": None,
            "ballot_number": heading.group(3),
            "date": date(int(moment.group(3)), int(moment.group(2)), int(moment.group(1))),
            "time": moment.group(4),
            "majority_base": majority_base.strip() or None,
            "majority_type": majority_type.strip() or None,
            "title": _text(title_and_moment.group(1)) if title_and_moment else None,
            "vote_type": None,
            "result": _text(result.group(1)),
            "president_name": _text(president.group(1)) if president else None,
            "affirmative_votes": counts[AFFIRMATIVE_LABEL],
            "negative_votes": counts[NEGATIVE_LABEL],
            "abstentions": counts[ABSTENTION_LABEL],
            "absents": counts[ABSENT_LABEL],
        }

    def _parse_deputy_votes(self, html: str, acta_id: int) -> list[dict[str, Any]]:
        body = html.find(TABLE_BODY)
        if body < 0:
            raise ValueError(f"acta {acta_id} de Diputados sin tabla de votos por diputado")
        rows: list[dict[str, Any]] = []
        for position, row in enumerate(ROW.findall(html[body:])):
            cells = CELL.findall(row)
            if len(cells) < DEPUTY_CELLS:
                continue
            rows.append(
                {
                    "vote_detail_id": f"{acta_id}-{_deputy_key(cells[0], position)}",
                    "vote_record_id": str(acta_id),
                    "legislator_name": _text(cells[NAME_CELL]),
                    "bloc": _text(cells[BLOC_CELL]),
                    "district": _text(cells[DISTRICT_CELL]),
                    "vote": _text(cells[VOTE_CELL]),
                }
            )
        if not rows:
            raise ValueError(f"acta {acta_id} de Diputados sin votos por diputado")
        return rows
