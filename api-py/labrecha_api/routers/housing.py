from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from labrecha_api.db import get_session
from labrecha_api.schemas import RentByNeighborhoodOut
from labrecha_db import RentByNeighborhood

router = APIRouter(prefix="/housing", tags=["housing"])


@router.get("/rent-by-neighborhood", response_model=list[RentByNeighborhoodOut])
def rent_by_neighborhood(
    session: Annotated[Session, Depends(get_session)],
) -> list[RentByNeighborhoodOut]:
    latest_month = (
        select(
            RentByNeighborhood.neighborhood.label("neighborhood"),
            func.max(RentByNeighborhood.date).label("date"),
        )
        .group_by(RentByNeighborhood.neighborhood)
        .subquery()
    )
    rows = session.scalars(
        select(RentByNeighborhood)
        .join(
            latest_month,
            (RentByNeighborhood.neighborhood == latest_month.c.neighborhood)
            & (RentByNeighborhood.date == latest_month.c.date),
        )
        .order_by(RentByNeighborhood.price.desc())
    ).all()
    return [
        RentByNeighborhoodOut(
            neighborhood=row.neighborhood,
            commune=row.commune,
            date=row.date,
            price=row.price,
            rooms=row.rooms,
        )
        for row in rows
    ]
