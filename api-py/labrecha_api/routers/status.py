from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from labrecha_api.db import get_session
from labrecha_api.schemas import ScrapeRunOut
from labrecha_db import ScrapeRun

router = APIRouter(tags=["status"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/scrape-runs", response_model=list[ScrapeRunOut])
def latest_scrape_runs(session: Annotated[Session, Depends(get_session)]) -> list[ScrapeRunOut]:
    latest = (
        select(ScrapeRun.job_name, func.max(ScrapeRun.started_at).label("started_at"))
        .group_by(ScrapeRun.job_name)
        .subquery()
    )
    statement = (
        select(ScrapeRun)
        .join(
            latest,
            (ScrapeRun.job_name == latest.c.job_name)
            & (ScrapeRun.started_at == latest.c.started_at),
        )
        .order_by(ScrapeRun.job_name)
    )
    return [
        ScrapeRunOut(
            job_name=run.job_name,
            status=run.status,
            started_at=run.started_at,
            finished_at=run.finished_at,
            rows_upserted=run.rows_upserted,
            error=run.error,
        )
        for run in session.scalars(statement).all()
    ]
