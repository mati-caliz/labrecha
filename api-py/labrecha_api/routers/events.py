from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select

from labrecha_api.db import SessionDependency
from labrecha_api.schemas import PoliticalEventOut
from labrecha_db import PoliticalEvent

router = APIRouter(prefix="/political-events", tags=["political-events"])


@router.get("", response_model=list[PoliticalEventOut])
def list_political_events(
    *,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    category: Annotated[str | None, Query()] = None,
    session: SessionDependency,
) -> list[PoliticalEventOut]:
    conditions = []
    if date_from is not None:
        conditions.append(PoliticalEvent.date >= date_from)
    if date_to is not None:
        conditions.append(PoliticalEvent.date <= date_to)
    if category is not None:
        conditions.append(PoliticalEvent.category == category)

    statement = select(PoliticalEvent).where(*conditions).order_by(PoliticalEvent.date)
    return [
        PoliticalEventOut(
            date=event.date,
            title=event.title,
            category=event.category,
            description=event.description,
        )
        for event in session.scalars(statement).all()
    ]
