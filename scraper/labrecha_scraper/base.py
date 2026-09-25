from __future__ import annotations

import logging
import traceback
from abc import ABC, abstractmethod
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

import httpx
from pydantic import BaseModel
from sqlalchemy import CursorResult, Result, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from labrecha_db import IndicatorHistory, ScrapeRun
from labrecha_scraper.config import settings
from labrecha_scraper.http_client import RetryingTransport

logger = logging.getLogger("labrecha_scraper")

ERROR_MAX_LENGTH = 8000

STATUS_RUNNING = "running"
STATUS_SUCCESS = "success"
STATUS_EMPTY = "empty"
STATUS_ERROR = "error"

DEFAULT_MIN_ROWS = 1
ZOMBIE_RUN_MAX_AGE = timedelta(hours=6)
ZOMBIE_RUN_ERROR = (
    "corrida interrumpida: quedó en curso más de "
    f"{int(ZOMBIE_RUN_MAX_AGE.total_seconds() // 3600)} h sin cerrarse"
)


class IndicatorPoint(BaseModel):
    indicator_code: str
    source: str
    date: date
    value: Decimal
    meta: dict[str, Any] = {}


class Connector[DataT](ABC):
    name: str
    source: str
    min_rows: int = DEFAULT_MIN_ROWS

    def build_client(self) -> httpx.Client:
        return httpx.Client(
            timeout=settings.http_timeout_seconds,
            headers={"User-Agent": settings.http_user_agent},
            follow_redirects=True,
            transport=RetryingTransport(
                httpx.HTTPTransport(),
                max_attempts=settings.http_max_attempts,
            ),
        )

    @abstractmethod
    def fetch(self) -> DataT:
        raise NotImplementedError

    @abstractmethod
    def persist(self, session: Session, data: DataT) -> int:
        raise NotImplementedError


class IndicatorConnector(Connector[list[IndicatorPoint]]):
    """Un conector de series: lo que baja son puntos de indicator_history."""

    def persist(self, session: Session, data: list[IndicatorPoint]) -> int:
        return upsert_indicator_points(session, data)


UPSERT_BATCH_SIZE = 5000


def _last_per_key(rows: list[dict[str, Any]], index_elements: list[str]) -> list[dict[str, Any]]:
    deduplicated: dict[tuple[Any, ...], dict[str, Any]] = {}
    for row in rows:
        deduplicated[tuple(row[column] for column in index_elements)] = row
    return list(deduplicated.values())


def upsert_rows(
    session: Session,
    model: type,
    rows: list[dict[str, Any]],
    index_elements: list[str],
    *,
    update_on_conflict: bool = True,
    batch_size: int = UPSERT_BATCH_SIZE,
) -> int:
    if not rows:
        return 0
    rows = _last_per_key(rows, index_elements)
    update_columns = [column for column in rows[0] if column not in index_elements]
    total = 0
    for start in range(0, len(rows), batch_size):
        chunk = rows[start : start + batch_size]
        statement = insert(model).values(chunk)
        if update_on_conflict and update_columns:
            statement = statement.on_conflict_do_update(
                index_elements=index_elements,
                set_={column: statement.excluded[column] for column in update_columns},
            )
        else:
            statement = statement.on_conflict_do_nothing(index_elements=index_elements)
        session.execute(statement)
        total += len(chunk)
    return total


def upsert_indicator_points(session: Session, points: list[IndicatorPoint]) -> int:
    if not points:
        return 0
    rows = [
        {
            "indicator_code": point.indicator_code,
            "source": point.source,
            "date": point.date,
            "value": point.value,
            "meta": point.meta,
        }
        for point in points
    ]
    statement = insert(IndicatorHistory).values(rows)
    statement = statement.on_conflict_do_update(
        constraint="uq_indicator_source_date",
        set_={"value": statement.excluded.value, "meta": statement.excluded.meta},
    )
    session.execute(statement)
    return len(rows)


def _format_error(error: Exception) -> str:
    summary = f"{type(error).__name__}: {error}"
    detail = "".join(traceback.format_exception(error)).rstrip()
    full = f"{summary}\n\n{detail}"
    if len(full) <= ERROR_MAX_LENGTH:
        return full
    return f"{summary}\n\n[traceback truncado]\n...{detail[-ERROR_MAX_LENGTH:]}"


def affected_rows(result: Result[Any]) -> int:
    if not isinstance(result, CursorResult):
        msg = "la sentencia de escritura no devolvió un CursorResult"
        raise TypeError(msg)
    return result.rowcount


def close_interrupted_runs(session: Session, job_name: str) -> int:
    cutoff = datetime.now(UTC) - ZOMBIE_RUN_MAX_AGE
    statement = (
        update(ScrapeRun)
        .where(
            ScrapeRun.job_name == job_name,
            ScrapeRun.status == STATUS_RUNNING,
            ScrapeRun.started_at < cutoff,
        )
        .values(status=STATUS_ERROR, error=ZOMBIE_RUN_ERROR, finished_at=func.now())
    )
    closed = affected_rows(session.execute(statement))
    session.commit()
    if closed:
        logger.warning(
            "job %s: %s corrida(s) interrumpida(s) marcadas como error", job_name, closed
        )
    return closed


def run_job[DataT](session: Session, connector: Connector[DataT]) -> ScrapeRun:
    close_interrupted_runs(session, connector.name)

    run = ScrapeRun(job_name=connector.name, status=STATUS_RUNNING)
    session.add(run)
    session.commit()

    try:
        data = connector.fetch()
        upserted = connector.persist(session, data)
        run.rows_upserted = upserted
        if upserted < connector.min_rows:
            run.status = STATUS_EMPTY
            run.error = (
                f"el conector no trajo datos: {upserted} filas, "
                f"mínimo esperado {connector.min_rows}"
            )
            logger.warning("job %s: sin datos (%s filas)", connector.name, upserted)
        else:
            run.status = STATUS_SUCCESS
            logger.info("job %s: %s filas upserted", connector.name, upserted)
        run.finished_at = func.now()
        session.commit()
    except Exception as error:
        session.rollback()
        run.status = STATUS_ERROR
        run.error = _format_error(error)
        run.finished_at = func.now()
        session.add(run)
        session.commit()
        logger.exception("job %s falló", connector.name)

    session.refresh(run)
    return run


def latest_run(session: Session, job_name: str) -> ScrapeRun | None:
    return session.scalars(
        select(ScrapeRun)
        .where(ScrapeRun.job_name == job_name)
        .order_by(ScrapeRun.started_at.desc())
        .limit(1)
    ).first()
