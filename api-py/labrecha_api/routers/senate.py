from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from labrecha_api.db import SessionDependency, get_session
from labrecha_api.schemas import BlocSummary, SenatorOut
from labrecha_db import Senator

router = APIRouter(prefix="/senate", tags=["senate"])


@router.get("/members", response_model=list[SenatorOut])
def list_members(
    *,
    bloc: Annotated[str | None, Query()] = None,
    province: Annotated[str | None, Query()] = None,
    session: SessionDependency,
) -> list[SenatorOut]:
    conditions = []
    if bloc is not None:
        conditions.append(Senator.bloc == bloc)
    if province is not None:
        conditions.append(Senator.province == province)

    statement = select(Senator).where(*conditions).order_by(Senator.last_name, Senator.first_name)
    return [
        SenatorOut(
            senator_id=senator.senator_id,
            last_name=senator.last_name,
            first_name=senator.first_name,
            bloc=senator.bloc,
            province=senator.province,
            party=senator.party,
            mandate_start=senator.mandate_start,
            mandate_end=senator.mandate_end,
        )
        for senator in session.scalars(statement).all()
    ]


@router.get("/blocs", response_model=list[BlocSummary])
def list_blocs(session: Annotated[Session, Depends(get_session)]) -> list[BlocSummary]:
    statement = (
        select(Senator.bloc, func.count())
        .group_by(Senator.bloc)
        .order_by(func.count().desc(), Senator.bloc)
    )
    return [BlocSummary(bloc=bloc, count=count) for bloc, count in session.execute(statement)]
