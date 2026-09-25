from __future__ import annotations

from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import ColumnElement, case, func, select
from sqlalchemy.orm import Session

from labrecha_api.db import SessionDependency, get_session
from labrecha_api.schemas import (
    BlocAttendanceOut,
    CongressVoteDetailOut,
    CongressVoteOut,
    SanctionedLawOut,
)
from labrecha_db import (
    CHAMBER_DEPUTIES,
    CHAMBER_SENATE,
    CongressVote,
    CongressVoteDetail,
    CongressVoteSummary,
    SanctionedLaw,
)

ABSENT_VOTE = "AUSENTE"
CHAMBERS = (CHAMBER_DEPUTIES, CHAMBER_SENATE)
MIN_BLOC_VOTES = 1000
PCT_PRECISION = Decimal("0.1")
ONE_HUNDRED = Decimal(100)

router = APIRouter(prefix="/congress", tags=["congress"])


def _to_vote_out(vote: CongressVote, summary: CongressVoteSummary | None) -> CongressVoteOut:
    return CongressVoteOut(
        vote_record_id=vote.vote_record_id,
        chamber=vote.chamber,
        period_number=vote.period_number,
        session_type=vote.session_type,
        date=vote.date,
        title=vote.title,
        vote_type=vote.vote_type,
        result=vote.result,
        president_name=vote.president_name,
        affirmative_votes=vote.affirmative_votes,
        negative_votes=vote.negative_votes,
        abstentions=vote.abstentions,
        absents=vote.absents,
        summary=summary.summary if summary is not None else None,
        topic=summary.topic if summary is not None else None,
    )


class VoteFilters(BaseModel):
    date_from: date | None = None
    date_to: date | None = None
    result: str | None = None
    chamber: str | None = None
    period_number: int | None = None
    limit: int = Field(default=50, ge=1, le=500)
    offset: int = Field(default=0, ge=0)


def _vote_conditions(filters: VoteFilters) -> list[ColumnElement[bool]]:
    conditions: list[ColumnElement[bool]] = []
    if filters.date_from is not None:
        conditions.append(CongressVote.date >= filters.date_from)
    if filters.date_to is not None:
        conditions.append(CongressVote.date <= filters.date_to)
    if filters.result is not None:
        conditions.append(CongressVote.result == filters.result)
    if filters.chamber is not None:
        if filters.chamber not in CHAMBERS:
            raise HTTPException(status_code=422, detail=f"cámara desconocida: {filters.chamber}")
        conditions.append(CongressVote.chamber == filters.chamber)
    if filters.period_number is not None:
        conditions.append(CongressVote.period_number == filters.period_number)
    return conditions


@router.get("/votes", response_model=list[CongressVoteOut])
def list_votes(
    filters: Annotated[VoteFilters, Query()],
    session: SessionDependency,
) -> list[CongressVoteOut]:
    conditions = _vote_conditions(filters)

    statement = (
        select(CongressVote, CongressVoteSummary)
        .outerjoin(
            CongressVoteSummary,
            CongressVoteSummary.vote_record_id == CongressVote.vote_record_id,
        )
        .where(*conditions)
        .order_by(CongressVote.date.desc().nullslast(), CongressVote.vote_record_id.desc())
        .limit(filters.limit)
        .offset(filters.offset)
    )
    return [_to_vote_out(vote, summary) for vote, summary in session.execute(statement).all()]


@router.get("/attendance", response_model=list[BlocAttendanceOut])
def bloc_attendance(
    *,
    chamber: Annotated[str | None, Query()] = None,
    session: SessionDependency,
) -> list[BlocAttendanceOut]:
    # Se agrupa por cámara además de por bloque: un mismo nombre de bloque puede existir en
    # las dos y sumarlos daría un porcentaje sobre denominadores que no son comparables.
    conditions: list[ColumnElement[bool]] = [CongressVoteDetail.bloc.is_not(None)]
    if chamber is not None:
        if chamber not in CHAMBERS:
            raise HTTPException(status_code=422, detail=f"cámara desconocida: {chamber}")
        conditions.append(CongressVote.chamber == chamber)

    present = func.sum(case((CongressVoteDetail.vote != ABSENT_VOTE, 1), else_=0))
    total = func.count()
    statement = (
        select(
            CongressVote.chamber,
            CongressVoteDetail.bloc,
            total.label("total"),
            present.label("present"),
        )
        .join(CongressVote, CongressVote.vote_record_id == CongressVoteDetail.vote_record_id)
        .where(*conditions)
        .group_by(CongressVote.chamber, CongressVoteDetail.bloc)
        .having(total >= MIN_BLOC_VOTES)
    )
    rows = [
        BlocAttendanceOut(
            chamber=vote_chamber,
            bloc=bloc,
            total_votes=int(total_votes),
            present_votes=int(present_votes),
            attendance_pct=(
                (Decimal(int(present_votes)) / Decimal(int(total_votes)) * ONE_HUNDRED).quantize(
                    PCT_PRECISION, rounding=ROUND_HALF_UP
                )
            ),
        )
        for vote_chamber, bloc, total_votes, present_votes in session.execute(statement).all()
    ]
    return sorted(rows, key=lambda row: row.attendance_pct, reverse=True)


@router.get("/laws", response_model=list[SanctionedLawOut])
def list_laws(
    *,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    chamber: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 30,
    offset: Annotated[int, Query(ge=0)] = 0,
    session: SessionDependency,
) -> list[SanctionedLawOut]:
    conditions = []
    if date_from is not None:
        conditions.append(SanctionedLaw.final_sanction >= date_from)
    if date_to is not None:
        conditions.append(SanctionedLaw.final_sanction <= date_to)
    if chamber is not None:
        conditions.append(SanctionedLaw.sanctioning_chamber == chamber)

    statement = (
        select(SanctionedLaw)
        .where(*conditions)
        .order_by(SanctionedLaw.final_sanction.desc().nullslast(), SanctionedLaw.law_number.desc())
        .limit(limit)
        .offset(offset)
    )
    return [
        SanctionedLawOut(
            law_number=law.law_number,
            project_id=law.project_id,
            sanctioning_chamber=law.sanctioning_chamber,
            initial_file=law.initial_file,
            first_half_sanction=law.first_half_sanction,
            second_half_sanction=law.second_half_sanction,
            final_sanction=law.final_sanction,
            title=law.title,
            summary=law.summary,
        )
        for law in session.scalars(statement).all()
    ]


@router.get("/votes/{vote_record_id}", response_model=CongressVoteOut)
def get_vote(
    vote_record_id: str, session: Annotated[Session, Depends(get_session)]
) -> CongressVoteOut:
    vote = session.get(CongressVote, vote_record_id)
    if vote is None:
        raise HTTPException(status_code=404, detail=f"acta desconocida: {vote_record_id}")
    return _to_vote_out(vote, session.get(CongressVoteSummary, vote_record_id))


@router.get("/votes/{vote_record_id}/details", response_model=list[CongressVoteDetailOut])
def list_vote_details(
    *,
    vote_record_id: str,
    vote: Annotated[str | None, Query()] = None,
    bloc: Annotated[str | None, Query()] = None,
    session: SessionDependency,
) -> list[CongressVoteDetailOut]:
    if session.get(CongressVote, vote_record_id) is None:
        raise HTTPException(status_code=404, detail=f"acta desconocida: {vote_record_id}")

    conditions = [CongressVoteDetail.vote_record_id == vote_record_id]
    if vote is not None:
        conditions.append(CongressVoteDetail.vote == vote)
    if bloc is not None:
        conditions.append(CongressVoteDetail.bloc == bloc)

    statement = (
        select(CongressVoteDetail)
        .where(*conditions)
        .order_by(CongressVoteDetail.bloc, CongressVoteDetail.legislator_name)
    )
    return [
        CongressVoteDetailOut(
            vote_record_id=detail.vote_record_id,
            legislator_name=detail.legislator_name,
            bloc=detail.bloc,
            district=detail.district,
            vote=detail.vote,
        )
        for detail in session.scalars(statement).all()
    ]
