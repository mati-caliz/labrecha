from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from labrecha_api.db import get_session
from labrecha_api.income_tax import calculate_income_tax
from labrecha_api.schemas import (
    CompoundInterestPeriod,
    CompoundInterestRequest,
    CompoundInterestResponse,
    IncomeTaxRequest,
    IncomeTaxResponse,
    InflationAdjustmentRequest,
    InflationAdjustmentResponse,
    TaxImpactRequest,
    TaxImpactResponse,
)
from labrecha_api.tax_impact import calculate_tax_impact
from labrecha_db import IndicatorHistory

router = APIRouter(prefix="/calculators", tags=["calculators"])

ONE_HUNDRED = Decimal(100)
RATE_PRECISION = Decimal("0.0000000001")
MONEY = Decimal("0.01")
IPC_INDICATOR = "cpi_monthly"


def _money(value: Decimal) -> Decimal:
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


@router.post("/compound-interest", response_model=CompoundInterestResponse)
def compound_interest(request: CompoundInterestRequest) -> CompoundInterestResponse:
    periods_per_year = request.compounding_frequency.periods_per_year
    total_periods = request.years * periods_per_year
    months_per_period = 12 // periods_per_year

    rate_per_period = (request.annual_rate / ONE_HUNDRED / periods_per_year).quantize(
        RATE_PRECISION, rounding=ROUND_HALF_UP
    )
    contribution = request.periodic_contribution

    running_total = request.initial_capital
    total_contributions = request.initial_capital
    periods: list[CompoundInterestPeriod] = []
    month_counter = 0
    for index in range(1, total_periods + 1):
        interest = running_total * rate_per_period
        running_total = running_total + interest + contribution
        total_contributions += contribution

        month_counter += 1
        if month_counter >= months_per_period or index == total_periods:
            periods.append(
                CompoundInterestPeriod(
                    period=(index * 12) // periods_per_year,
                    principal=_money(total_contributions - request.initial_capital),
                    interest=_money(running_total - total_contributions),
                    total=_money(running_total),
                )
            )
            month_counter = 0

    return CompoundInterestResponse(
        final_amount=_money(running_total),
        total_contributions=_money(total_contributions),
        total_interest=_money(running_total - total_contributions),
        periods=periods,
    )


@router.post("/income-tax", response_model=IncomeTaxResponse)
def income_tax(request: IncomeTaxRequest) -> IncomeTaxResponse:
    return calculate_income_tax(request)


@router.post("/tax-impact", response_model=TaxImpactResponse)
def tax_impact(request: TaxImpactRequest) -> TaxImpactResponse:
    return calculate_tax_impact(request)


@router.post("/inflation-adjustment", response_model=InflationAdjustmentResponse)
def inflation_adjustment(
    request: InflationAdjustmentRequest, session: Annotated[Session, Depends(get_session)]
) -> InflationAdjustmentResponse:
    if request.from_date > request.to_date:
        raise HTTPException(status_code=422, detail="from_date debe ser anterior o igual a to_date")

    month_start = func.date_trunc("month", IndicatorHistory.date)
    statement = (
        select(IndicatorHistory.value)
        .where(
            IndicatorHistory.indicator_code == IPC_INDICATOR,
            month_start >= func.date_trunc("month", request.from_date),
            month_start <= func.date_trunc("month", request.to_date),
        )
        .order_by(IndicatorHistory.date)
    )
    monthly_values = session.scalars(statement).all()
    if not monthly_values:
        raise HTTPException(
            status_code=404, detail="sin datos de inflación mensual para el rango solicitado"
        )

    factor = Decimal(1)
    for value in monthly_values:
        factor *= Decimal(1) + value / ONE_HUNDRED

    adjusted = _money(request.amount * factor)
    cumulative = _money((factor - Decimal(1)) * ONE_HUNDRED)
    months_elapsed = (request.to_date.year - request.from_date.year) * 12 + (
        request.to_date.month - request.from_date.month
    )

    return InflationAdjustmentResponse(
        original_amount=request.amount,
        adjusted_amount=adjusted,
        from_date=request.from_date,
        to_date=request.to_date,
        cumulative_inflation=cumulative,
        months_elapsed=months_elapsed,
    )
