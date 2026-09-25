from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from labrecha_api.clock import today_in_argentina
from labrecha_api.db import SessionDependency
from labrecha_api.government_terms import TERMS, GovernmentTerm
from labrecha_api.schemas import IndicatorTermsOut, IndicatorTermStat, TermMethod
from labrecha_api.series_change import (
    accumulated_change,
    annualize,
    method_for,
    most_covered_source,
)
from labrecha_db import IndicatorHistory

router = APIRouter(prefix="/terms", tags=["terms"])


def _term_stat(
    term: GovernmentTerm,
    points: list[tuple[date, Decimal]],
    method: TermMethod,
) -> IndicatorTermStat | None:
    if not points:
        return None

    first_date, first_value = points[0]
    last_date, last_value = points[-1]

    values = [value for _, value in points]
    average = sum(values, Decimal(0)) / Decimal(len(values))
    change = accumulated_change(points, method)

    return IndicatorTermStat(
        term_id=term.term_id,
        president=term.president,
        start=term.start,
        end=term.end,
        first_date=first_date,
        last_date=last_date,
        first_value=first_value,
        last_value=last_value,
        average=average,
        points=len(points),
        change_pct=change,
        annualized_pct=annualize(change, first_date, last_date),
    )


@router.get("/{indicator_code}", response_model=IndicatorTermsOut)
def indicator_by_term(
    *,
    indicator_code: str,
    source: Annotated[str | None, Query()] = None,
    session: SessionDependency,
) -> IndicatorTermsOut:
    conditions = [IndicatorHistory.indicator_code == indicator_code]
    if source is not None:
        conditions.append(IndicatorHistory.source == source)

    statement = (
        select(IndicatorHistory.date, IndicatorHistory.value, IndicatorHistory.source)
        .where(*conditions)
        .order_by(IndicatorHistory.date)
    )
    rows = session.execute(statement).all()
    if not rows:
        raise HTTPException(status_code=404, detail=f"sin datos para '{indicator_code}'")

    resolved_source = source if source is not None else most_covered_source(rows)
    series = [(day, value) for day, value, row_source in rows if row_source == resolved_source]
    if not series:
        raise HTTPException(
            status_code=404, detail=f"sin datos de '{resolved_source}' para '{indicator_code}'"
        )

    method = method_for(indicator_code)
    stats: list[IndicatorTermStat] = []
    for term in TERMS:
        end = term.end if term.end is not None else today_in_argentina()
        window = [(day, value) for day, value in series if term.start <= day <= end]
        stat = _term_stat(term, window, method)
        if stat is not None:
            stats.append(stat)

    return IndicatorTermsOut(
        indicator_code=indicator_code,
        source=resolved_source,
        method=method,
        terms=stats,
    )
