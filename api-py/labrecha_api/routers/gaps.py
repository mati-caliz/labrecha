from __future__ import annotations

from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, tuple_
from sqlalchemy.orm import Session

from labrecha_api.clock import today_in_argentina
from labrecha_api.db import SessionDependency, get_session
from labrecha_api.schemas import (
    GapExclusion,
    GapHistoryOut,
    GapHistoryPoint,
    GapMeasurement,
    GapOut,
)
from labrecha_db import IndicatorHistory

router = APIRouter(prefix="/gaps", tags=["gaps"])

MIN_SOURCES = 2
DEFAULT_LIMIT = 30
MAX_LIMIT = 200
PERCENT = 100

MISSING_UNIT_REASON = "sin unidad declarada en la medición"
PERCENT_UNIT = "%"

RECENT_WINDOW_DAYS = 400


@dataclass(frozen=True)
class Measurement:
    source: str
    value: Decimal
    unit: str | None


def _window_start(today: date) -> date:
    return today - timedelta(days=RECENT_WINDOW_DAYS)


def _latest_shared_dates(
    session: Session, min_sources: int, indicator_code: str | None = None
) -> dict[str, date]:
    conditions = (
        [IndicatorHistory.date >= _window_start(today_in_argentina())]
        if indicator_code is None
        else [IndicatorHistory.indicator_code == indicator_code]
    )
    shared = (
        select(
            IndicatorHistory.indicator_code.label("indicator_code"),
            IndicatorHistory.date.label("date"),
        )
        .where(*conditions)
        .group_by(IndicatorHistory.indicator_code, IndicatorHistory.date)
        .having(func.count(func.distinct(IndicatorHistory.source)) >= min_sources)
        .subquery()
    )
    statement = select(shared.c.indicator_code, func.max(shared.c.date)).group_by(
        shared.c.indicator_code
    )
    return dict(session.execute(statement).all())


def _measurements_at(
    session: Session, latest_by_code: dict[str, date]
) -> dict[str, list[Measurement]]:
    if not latest_by_code:
        return {}
    statement = select(
        IndicatorHistory.indicator_code,
        IndicatorHistory.source,
        IndicatorHistory.value,
        IndicatorHistory.meta,
    ).where(
        tuple_(IndicatorHistory.indicator_code, IndicatorHistory.date).in_(
            list(latest_by_code.items())
        )
    )
    grouped: dict[str, list[Measurement]] = defaultdict(list)
    for code, source, value, meta in session.execute(statement):
        declared_unit = (meta or {}).get("unit")
        unit = str(declared_unit) if declared_unit else None
        grouped[code].append(Measurement(source=source, value=value, unit=unit))
    return grouped


def _comparable_unit(measurements: list[Measurement]) -> str | None:
    by_unit: dict[str, list[Measurement]] = defaultdict(list)
    for measurement in measurements:
        if measurement.unit is not None:
            by_unit[measurement.unit].append(measurement)
    comparable = [unit for unit, group in by_unit.items() if len(group) >= MIN_SOURCES]
    if not comparable:
        return None
    return min(comparable, key=lambda unit: (-len(by_unit[unit]), unit))


def _gap_magnitude(unit: str, spread: Decimal, gap_pct: float) -> float:
    if unit == PERCENT_UNIT:
        return float(abs(spread))
    return abs(gap_pct)


def _exclusion_reason(measurement: Measurement, unit: str) -> str | None:
    if measurement.unit is None:
        return MISSING_UNIT_REASON
    if measurement.unit != unit:
        return f"unidad distinta: {measurement.unit} (se compara en {unit})"
    return None


def _build_gap(code: str, day: date, measurements: list[Measurement]) -> GapOut | None:
    unit = _comparable_unit(measurements)
    if unit is None:
        return None

    excluded = [
        GapExclusion(source=measurement.source, reason=reason)
        for measurement in sorted(measurements, key=lambda item: item.source)
        if (reason := _exclusion_reason(measurement, unit)) is not None
    ]
    comparable = [measurement for measurement in measurements if measurement.unit == unit]
    if len(comparable) < MIN_SOURCES:
        return None

    ordered = sorted(comparable, key=lambda item: item.value, reverse=True)
    higher, lower = ordered[0], ordered[-1]
    spread = higher.value - lower.value
    base = abs(lower.value)
    gap_pct = float(spread / base * PERCENT) if base != 0 else 0.0

    return GapOut(
        indicator_code=code,
        date=day,
        higher_source=higher.source,
        higher_value=higher.value,
        lower_source=lower.source,
        lower_value=lower.value,
        spread=spread,
        gap_pct=round(gap_pct, 4),
        unit=unit,
        measurements=[
            GapMeasurement(source=measurement.source, value=measurement.value)
            for measurement in ordered
        ],
        excluded_sources=excluded,
    )


@router.get("", response_model=list[GapOut])
def list_gaps(
    *,
    limit: Annotated[int, Query(ge=1, le=MAX_LIMIT)] = DEFAULT_LIMIT,
    min_sources: Annotated[int, Query(ge=2)] = MIN_SOURCES,
    session: SessionDependency,
) -> list[GapOut]:
    latest_by_code = _latest_shared_dates(session, min_sources)
    grouped = _measurements_at(session, latest_by_code)

    gaps = [
        gap
        for code, day in latest_by_code.items()
        if (gap := _build_gap(code, day, grouped.get(code, []))) is not None
    ]
    gaps.sort(key=lambda item: _gap_magnitude(item.unit, item.spread, item.gap_pct), reverse=True)
    return gaps[:limit]


@router.get("/{indicator_code}", response_model=GapOut)
def get_gap(indicator_code: str, session: Annotated[Session, Depends(get_session)]) -> GapOut:
    latest_by_code = _latest_shared_dates(session, MIN_SOURCES, indicator_code)
    day = latest_by_code.get(indicator_code)
    if day is None:
        raise HTTPException(
            status_code=404,
            detail=f"'{indicator_code}' no tiene dos fuentes con dato en una misma fecha",
        )
    measurements = _measurements_at(session, {indicator_code: day}).get(indicator_code, [])
    gap = _build_gap(indicator_code, day, measurements)
    if gap is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"sin brecha calculable para '{indicator_code}': "
                "no hay dos fuentes que declaren la misma unidad"
            ),
        )
    return gap


def _history_point(day: date, measurements: list[Measurement], unit: str) -> GapHistoryPoint | None:
    comparable = [item for item in measurements if item.unit == unit]
    if len(comparable) < MIN_SOURCES:
        return None
    ordered = sorted(comparable, key=lambda item: item.value, reverse=True)
    higher, lower = ordered[0], ordered[-1]
    spread = higher.value - lower.value
    base = abs(lower.value)
    return GapHistoryPoint(
        date=day,
        higher_source=higher.source,
        lower_source=lower.source,
        spread=spread,
        gap_pct=round(float(spread / base * PERCENT) if base != 0 else 0.0, 4),
        sources=len(ordered),
    )


def _magnitude_for(unit: str) -> Callable[[GapHistoryPoint], float]:
    return lambda point: _gap_magnitude(unit, point.spread, point.gap_pct)


def _measurements_by_date(session: Session, indicator_code: str) -> dict[date, list[Measurement]]:
    statement = select(
        IndicatorHistory.date,
        IndicatorHistory.source,
        IndicatorHistory.value,
        IndicatorHistory.meta,
    ).where(IndicatorHistory.indicator_code == indicator_code)
    grouped: dict[date, list[Measurement]] = defaultdict(list)
    for day, source, value, meta in session.execute(statement):
        declared_unit = (meta or {}).get("unit")
        grouped[day].append(
            Measurement(
                source=source, value=value, unit=str(declared_unit) if declared_unit else None
            )
        )
    return grouped


@router.get("/{indicator_code}/history", response_model=GapHistoryOut)
def get_gap_history(
    indicator_code: str, session: Annotated[Session, Depends(get_session)]
) -> GapHistoryOut:
    by_date = _measurements_by_date(session, indicator_code)
    unit = _comparable_unit([item for values in by_date.values() for item in values])
    if unit is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"sin historia de brecha para '{indicator_code}': "
                "no hay dos fuentes que declaren la misma unidad"
            ),
        )

    points = [
        point
        for day in sorted(by_date)
        if (point := _history_point(day, by_date[day], unit)) is not None
    ]
    if not points:
        raise HTTPException(
            status_code=404,
            detail=f"'{indicator_code}' nunca tuvo dos fuentes midiendo la misma fecha",
        )

    magnitude = _magnitude_for(unit)
    return GapHistoryOut(
        indicator_code=indicator_code,
        unit=unit,
        points=points,
        widest=max(points, key=magnitude),
        narrowest=min(points, key=magnitude),
        latest=points[-1],
    )
