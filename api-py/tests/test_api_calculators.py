from __future__ import annotations

from datetime import date
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from labrecha_db import IndicatorHistory

OK = 200
NOT_FOUND = 404
UNPROCESSABLE = 422


def test_compound_interest_totals_add_up(client: TestClient) -> None:
    response = client.post(
        "/calculators/compound-interest",
        json={
            "initial_capital": "1000",
            "annual_rate": "12",
            "years": 1,
            "compounding_frequency": "QUARTERLY",
            "periodic_contribution": "100",
        },
    )

    assert response.status_code == OK
    body = response.json()
    assert body["periods"][-1]["period"] == 12
    assert Decimal(body["total_contributions"]) == Decimal("1400.00")
    assert Decimal(body["final_amount"]) == Decimal(body["periods"][-1]["total"])
    assert Decimal(body["total_interest"]) == (
        Decimal(body["final_amount"]) - Decimal(body["total_contributions"])
    )


def test_monthly_compounding_without_contributions(client: TestClient) -> None:
    response = client.post(
        "/calculators/compound-interest",
        json={
            "initial_capital": "1000",
            "annual_rate": "0",
            "years": 2,
            "compounding_frequency": "MONTHLY",
        },
    )

    body = response.json()
    assert len(body["periods"]) == 24
    assert Decimal(body["final_amount"]) == Decimal("1000.00")
    assert Decimal(body["total_interest"]) == Decimal("0.00")


def test_income_tax_endpoint_uses_the_calculator(client: TestClient) -> None:
    response = client.post("/calculators/income-tax", json={"gross_monthly_salary": "800000"})

    assert response.status_code == OK
    assert Decimal(response.json()["annual_tax"]) == Decimal(0)


def test_tax_impact_endpoint_uses_the_calculator(client: TestClient) -> None:
    response = client.post(
        "/calculators/tax-impact",
        json={"gross_monthly_salary": "1500000", "monthly_expenses": "900000"},
    )

    assert response.status_code == OK


def _seed_monthly_cpi(session: Session, values: dict[date, str]) -> None:
    session.add_all(
        IndicatorHistory(
            indicator_code="cpi_monthly", source="indec", date=day, value=Decimal(value), meta={}
        )
        for day, value in values.items()
    )
    session.commit()


def test_inflation_adjustment_compounds_the_monthly_cpi(
    client: TestClient, db_session: Session
) -> None:
    _seed_monthly_cpi(
        db_session,
        {date(2026, 1, 1): "10", date(2026, 2, 1): "10", date(2026, 4, 1): "50"},
    )

    response = client.post(
        "/calculators/inflation-adjustment",
        json={"amount": "1000", "from_date": "2026-01-15", "to_date": "2026-02-10"},
    )

    assert response.status_code == OK
    body = response.json()
    assert Decimal(body["adjusted_amount"]) == Decimal("1210.00")
    assert Decimal(body["cumulative_inflation"]) == Decimal("21.00")
    assert body["months_elapsed"] == 1


def test_inflation_adjustment_without_data_is_not_found(client: TestClient) -> None:
    response = client.post(
        "/calculators/inflation-adjustment",
        json={"amount": "1000", "from_date": "2020-01-01", "to_date": "2020-06-01"},
    )

    assert response.status_code == NOT_FOUND


def test_inflation_adjustment_rejects_an_inverted_range(client: TestClient) -> None:
    response = client.post(
        "/calculators/inflation-adjustment",
        json={"amount": "1000", "from_date": "2026-06-01", "to_date": "2026-01-01"},
    )

    assert response.status_code == UNPROCESSABLE
