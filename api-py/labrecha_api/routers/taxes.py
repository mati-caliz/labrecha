from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select

from labrecha_api.db import SessionDependency
from labrecha_api.schemas import TaxChangeOut
from labrecha_db import TaxChange

router = APIRouter(prefix="/taxes", tags=["taxes"])


@router.get("/changes", response_model=list[TaxChangeOut])
def list_changes(
    *,
    change_type: Annotated[str | None, Query()] = None,
    jurisdiction: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    session: SessionDependency,
) -> list[TaxChangeOut]:
    conditions = []
    if change_type is not None:
        conditions.append(TaxChange.change_type == change_type)
    if jurisdiction is not None:
        conditions.append(TaxChange.jurisdiction == jurisdiction)

    statement = (
        select(TaxChange)
        .where(*conditions)
        .order_by(TaxChange.date.desc(), TaxChange.regulation_id.desc())
        .limit(limit)
        .offset(offset)
    )
    return [
        TaxChangeOut(
            regulation_id=item.regulation_id,
            date=item.date,
            change_type=item.change_type,
            tax_name=item.tax_name,
            jurisdiction=item.jurisdiction,
            title=item.title,
            url=item.url,
        )
        for item in session.scalars(statement).all()
    ]
