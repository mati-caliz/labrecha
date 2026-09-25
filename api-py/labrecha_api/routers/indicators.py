from __future__ import annotations

import csv
import io
from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from labrecha_api.db import SessionDependency, get_session
from labrecha_api.schemas import (
    IndicatorPoint,
    IndicatorSeries,
    IndicatorSourceSummary,
    IndicatorSummary,
    IndicatorVariationOut,
)
from labrecha_api.series_change import (
    accumulated_change,
    annualize,
    method_for,
    most_covered_source,
)
from labrecha_db import IndicatorHistory

router = APIRouter(prefix="/indicators", tags=["indicators"])

DEFAULT_LIMIT = 5000
MAX_LIMIT = 50000


class SeriesFilters(BaseModel):
    source: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    limit: int = Field(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT)
    order: str = Field(default="asc", pattern="^(asc|desc)$")


class CsvFilters(SeriesFilters):
    """El CSV baja la serie entera en orden cronológico salvo que se pida menos."""

    limit: int = Field(default=MAX_LIMIT, ge=1, le=MAX_LIMIT)
    order: Literal["asc"] = "asc"


MIN_VARIATION_POINTS = 2


@router.get("", response_model=list[IndicatorSummary])
def list_indicators(session: Annotated[Session, Depends(get_session)]) -> list[IndicatorSummary]:
    statement = (
        select(
            IndicatorHistory.indicator_code,
            func.array_agg(func.distinct(IndicatorHistory.source)),
            func.count(),
            func.min(IndicatorHistory.date),
            func.max(IndicatorHistory.date),
        )
        .group_by(IndicatorHistory.indicator_code)
        .order_by(IndicatorHistory.indicator_code)
    )
    return [
        IndicatorSummary(
            indicator_code=code,
            sources=sorted(sources),
            count=count,
            first_date=first_date,
            last_date=last_date,
        )
        for code, sources, count, first_date, last_date in session.execute(statement)
    ]


@router.get("/{indicator_code}/sources", response_model=list[IndicatorSourceSummary])
def list_indicator_sources(
    indicator_code: str, session: Annotated[Session, Depends(get_session)]
) -> list[IndicatorSourceSummary]:
    aggregate = (
        select(
            IndicatorHistory.source.label("source"),
            func.count().label("count"),
            func.min(IndicatorHistory.date).label("first_date"),
            func.max(IndicatorHistory.date).label("last_date"),
        )
        .where(IndicatorHistory.indicator_code == indicator_code)
        .group_by(IndicatorHistory.source)
        .subquery()
    )
    statement = (
        select(
            aggregate.c.source,
            aggregate.c.count,
            aggregate.c.first_date,
            aggregate.c.last_date,
            IndicatorHistory.value,
        )
        .join(
            IndicatorHistory,
            (IndicatorHistory.source == aggregate.c.source)
            & (IndicatorHistory.date == aggregate.c.last_date)
            & (IndicatorHistory.indicator_code == indicator_code),
        )
        .order_by(aggregate.c.source)
    )
    results = [
        IndicatorSourceSummary(
            source=source,
            count=count,
            first_date=first_date,
            last_date=last_date,
            latest_value=latest_value,
        )
        for source, count, first_date, last_date, latest_value in session.execute(statement)
    ]
    if not results:
        raise HTTPException(status_code=404, detail=f"indicador desconocido: {indicator_code}")
    return results


@router.get("/{indicator_code}/variation", response_model=IndicatorVariationOut)
def indicator_variation_since(
    *,
    indicator_code: str,
    date_from: Annotated[date, Query()],
    source: Annotated[str | None, Query()] = None,
    session: SessionDependency,
) -> IndicatorVariationOut:
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
    window = [
        (day, value)
        for day, value, row_source in rows
        if row_source == resolved_source and day >= date_from
    ]
    if len(window) < MIN_VARIATION_POINTS:
        raise HTTPException(
            status_code=404,
            detail=(
                f"'{indicator_code}' no tiene dos mediciones de '{resolved_source}' "
                f"desde {date_from.isoformat()}"
            ),
        )

    method = method_for(indicator_code)
    first_date, first_value = window[0]
    last_date, last_value = window[-1]
    change = accumulated_change(window, method)

    return IndicatorVariationOut(
        indicator_code=indicator_code,
        source=resolved_source,
        method=method,
        requested_from=date_from,
        first_date=first_date,
        last_date=last_date,
        first_value=first_value,
        last_value=last_value,
        points=len(window),
        change_pct=change,
        annualized_pct=annualize(change, first_date, last_date),
    )


@router.get("/{indicator_code}", response_model=IndicatorSeries)
def get_indicator_series(
    indicator_code: str,
    filters: Annotated[SeriesFilters, Query()],
    session: SessionDependency,
) -> IndicatorSeries:
    conditions = [IndicatorHistory.indicator_code == indicator_code]
    if filters.source is not None:
        conditions.append(IndicatorHistory.source == filters.source)
    if filters.date_from is not None:
        conditions.append(IndicatorHistory.date >= filters.date_from)
    if filters.date_to is not None:
        conditions.append(IndicatorHistory.date <= filters.date_to)

    ascending = filters.order == "asc"
    ordering = IndicatorHistory.date.asc() if ascending else IndicatorHistory.date.desc()
    statement = (
        select(IndicatorHistory)
        .where(*conditions)
        .order_by(ordering, IndicatorHistory.source)
        .limit(filters.limit)
    )
    rows = session.scalars(statement).all()
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"sin datos para indicador '{indicator_code}' con los filtros dados",
        )
    return IndicatorSeries(
        indicator_code=indicator_code,
        points=[
            IndicatorPoint(date=row.date, value=row.value, source=row.source, meta=row.meta or {})
            for row in rows
        ],
    )


CSV_HEADER = ["date", "indicator_code", "source", "value"]


@router.get("/{indicator_code}/csv", response_class=StreamingResponse)
def get_indicator_csv(
    indicator_code: str,
    filters: Annotated[CsvFilters, Query()],
    session: SessionDependency,
) -> StreamingResponse:
    series = get_indicator_series(indicator_code, filters, session)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(CSV_HEADER)
    for point in series.points:
        writer.writerow([point.date.isoformat(), indicator_code, point.source, point.value])
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{indicator_code}.csv"'},
    )
