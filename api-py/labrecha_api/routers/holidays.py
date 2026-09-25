from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import extract, select

from labrecha_api.db import SessionDependency
from labrecha_api.schemas import HolidayOut
from labrecha_db import Holiday

router = APIRouter(prefix="/holidays", tags=["holidays"])


@router.get("", response_model=list[HolidayOut])
def list_holidays(
    *,
    year: Annotated[int | None, Query()] = None,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    session: SessionDependency,
) -> list[HolidayOut]:
    conditions = []
    if year is not None:
        conditions.append(extract("year", Holiday.date) == year)
    if date_from is not None:
        conditions.append(Holiday.date >= date_from)
    if date_to is not None:
        conditions.append(Holiday.date <= date_to)

    statement = select(Holiday).where(*conditions).order_by(Holiday.date, Holiday.name)
    return [
        HolidayOut(
            date=holiday.date,
            name=holiday.name,
            local_name=holiday.local_name,
            is_global=holiday.is_global,
            is_fixed=holiday.is_fixed,
            types=holiday.types,
        )
        for holiday in session.scalars(statement).all()
    ]
