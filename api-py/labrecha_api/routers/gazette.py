from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select

from labrecha_api.db import SessionDependency
from labrecha_api.schemas import GazetteSummaryOut
from labrecha_db import GazetteSummary

router = APIRouter(prefix="/gazette", tags=["gazette"])


@router.get("/summaries", response_model=list[GazetteSummaryOut])
def list_summaries(
    *,
    category: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    session: SessionDependency,
) -> list[GazetteSummaryOut]:
    conditions = []
    if category is not None:
        conditions.append(GazetteSummary.category == category)

    statement = (
        select(GazetteSummary)
        .where(*conditions)
        .order_by(GazetteSummary.date.desc(), GazetteSummary.regulation_id.desc())
        .limit(limit)
        .offset(offset)
    )
    return [
        GazetteSummaryOut(
            regulation_id=item.regulation_id,
            date=item.date,
            section=item.section,
            title=item.title,
            summary=item.summary.split("\n"),
            category=item.category,
            url=item.url,
        )
        for item in session.scalars(statement).all()
    ]
