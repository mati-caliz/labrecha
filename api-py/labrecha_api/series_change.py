from __future__ import annotations

from collections import Counter
from collections.abc import Sequence
from datetime import date
from decimal import Decimal

from sqlalchemy import Row

from labrecha_api.schemas import TermMethod

PERCENT = Decimal(100)
MONTHS_PER_YEAR = Decimal(12)
DAYS_PER_MONTH = Decimal("30.4375")

MONTHLY_RATE_INDICATORS = {"cpi_monthly"}


def method_for(indicator_code: str) -> TermMethod:
    return (
        TermMethod.COMPOUNDED if indicator_code in MONTHLY_RATE_INDICATORS else TermMethod.ENDPOINTS
    )


def compound(values: list[Decimal]) -> Decimal:
    accumulated = Decimal(1)
    for value in values:
        accumulated *= Decimal(1) + value / PERCENT
    return (accumulated - Decimal(1)) * PERCENT


def annualize(total_change_pct: Decimal, first: date, last: date) -> Decimal | None:
    months = Decimal((last - first).days) / DAYS_PER_MONTH
    if months <= 0:
        return None
    growth = Decimal(1) + total_change_pct / PERCENT
    if growth <= 0:
        return None
    exponent = MONTHS_PER_YEAR / months
    annualized = Decimal(pow(float(growth), float(exponent))) - Decimal(1)
    return annualized * PERCENT


def accumulated_change(points: list[tuple[date, Decimal]], method: TermMethod) -> Decimal:
    if not points:
        return Decimal(0)
    if method is TermMethod.COMPOUNDED:
        return compound([value for _, value in points])
    _, first_value = points[0]
    _, last_value = points[-1]
    if first_value == 0:
        return Decimal(0)
    return (last_value - first_value) / abs(first_value) * PERCENT


def most_covered_source(
    rows: Sequence[tuple[date, Decimal, str]] | Sequence[Row[date, Decimal, str]],
) -> str:
    counts = Counter(row_source for _, _, row_source in rows)
    return counts.most_common(1)[0][0]
