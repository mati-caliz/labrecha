from __future__ import annotations

from bisect import bisect_right
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from labrecha_db import IndicatorHistory
from labrecha_scraper.base import Connector, IndicatorPoint, upsert_indicator_points
from labrecha_scraper.units import Unit

DERIVED_SOURCE = "labrecha"
CPI_CODE = "cpi_level_general"
CPI_SOURCE = "datosgobar"
DEFLATED_DECIMALS = Decimal("0.01")
RATE_DECIMALS = Decimal("0.0001")

DEFLATED_SERIES: dict[str, str] = {
    "minimum_wage": "minimum_wage_real",
    "pension_minimum": "pension_minimum_real",
}
DEFLATED_SOURCE = "datosgobar"
DEFLATED_BASE_MONTH = date(2024, 12, 1)

IMPLICIT_FX_CODE = "implicit_fx_rate"
IMPLICIT_FX_NUMERATOR = "monetary_base"
IMPLICIT_FX_DENOMINATOR = "international_reserves"
IMPLICIT_FX_SOURCE = "bcra"
RESERVES_MAX_LAG_DAYS = 15


def _load(session: Session, code: str, source: str) -> list[tuple[date, Decimal]]:
    statement = (
        select(IndicatorHistory.date, IndicatorHistory.value)
        .where(IndicatorHistory.indicator_code == code, IndicatorHistory.source == source)
        .order_by(IndicatorHistory.date)
    )
    return [(row_date, row_value) for row_date, row_value in session.execute(statement)]


def _by_month(series: list[tuple[date, Decimal]]) -> dict[tuple[int, int], Decimal]:
    return {(day.year, day.month): value for day, value in series}


def _deflated_points(session: Session, nominal_code: str, real_code: str) -> list[IndicatorPoint]:
    cpi = _load(session, CPI_CODE, CPI_SOURCE)
    nominal = _load(session, nominal_code, DEFLATED_SOURCE)
    if not cpi or not nominal:
        return []

    cpi_by_month = _by_month(cpi)
    base_index = cpi_by_month.get((DEFLATED_BASE_MONTH.year, DEFLATED_BASE_MONTH.month))
    if base_index is None or base_index == 0:
        return []

    points: list[IndicatorPoint] = []
    for day, value in nominal:
        index = cpi_by_month.get((day.year, day.month))
        if index is None or index == 0:
            continue
        points.append(
            IndicatorPoint(
                indicator_code=real_code,
                source=DERIVED_SOURCE,
                date=day,
                value=(value * base_index / index).quantize(DEFLATED_DECIMALS),
                meta={
                    "unit": Unit.ARS,
                    "derived_from": [nominal_code, CPI_CODE],
                    "method": "deflactado por IPC nivel general",
                    "base_month": DEFLATED_BASE_MONTH.isoformat(),
                },
            )
        )
    return points


def _latest_at_or_before(
    series: list[tuple[date, Decimal]], day: date, max_lag_days: int
) -> tuple[date, Decimal] | None:
    position = bisect_right([row_date for row_date, _ in series], day)
    if position == 0:
        return None
    row_date, value = series[position - 1]
    if (day - row_date).days > max_lag_days:
        return None
    return row_date, value


def _implicit_fx_points(session: Session) -> list[IndicatorPoint]:
    base = _load(session, IMPLICIT_FX_NUMERATOR, IMPLICIT_FX_SOURCE)
    reserves = _load(session, IMPLICIT_FX_DENOMINATOR, IMPLICIT_FX_SOURCE)
    if not base or not reserves:
        return []

    points: list[IndicatorPoint] = []
    for day, base_value in base:
        matched = _latest_at_or_before(reserves, day, RESERVES_MAX_LAG_DAYS)
        if matched is None:
            continue
        reserve_date, reserve_value = matched
        if reserve_value <= 0:
            continue
        points.append(
            IndicatorPoint(
                indicator_code=IMPLICIT_FX_CODE,
                source=DERIVED_SOURCE,
                date=day,
                value=(base_value / reserve_value).quantize(RATE_DECIMALS),
                meta={
                    "unit": Unit.ARS_PER_USD,
                    "derived_from": [IMPLICIT_FX_NUMERATOR, IMPLICIT_FX_DENOMINATOR],
                    "method": "base monetaria sobre reservas internacionales, ambas del BCRA",
                    "reserves_date": reserve_date.isoformat(),
                },
            )
        )
    return points


class DerivedIndicatorsConnector(Connector[None]):
    name = "derived"
    source = DERIVED_SOURCE

    def fetch(self) -> None:
        return None

    def persist(self, session: Session, _data: None) -> int:
        points: list[IndicatorPoint] = []
        for nominal_code, real_code in DEFLATED_SERIES.items():
            points.extend(_deflated_points(session, nominal_code, real_code))
        points.extend(_implicit_fx_points(session))
        return upsert_indicator_points(session, points)
