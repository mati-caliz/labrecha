from __future__ import annotations

import csv
import io
from collections.abc import Mapping
from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from labrecha_db import IndicatorHistory

OK = 200
NOT_FOUND = 404
UNPROCESSABLE = 422

PERCENT_META = {"unit": "%"}


def seed(session: Session, rows: list[tuple[str, str, date, str, Mapping[str, object]]]) -> None:
    session.add_all(
        [
            IndicatorHistory(
                indicator_code=code, source=source, date=day, value=Decimal(value), meta=meta
            )
            for code, source, day, value, meta in rows
        ]
    )
    session.commit()


@pytest.fixture
def dollar_series(db_session: Session) -> None:
    seed(
        db_session,
        [
            ("dollar_blue", "dolarapi", date(2026, 1, 5), "1500", {"unit": "ARS"}),
            ("dollar_blue", "dolarapi", date(2026, 1, 6), "1520", {"unit": "ARS"}),
            ("dollar_blue", "argentinadatos", date(2026, 1, 6), "1510", {"unit": "ARS"}),
            ("dollar_official", "dolarapi", date(2026, 1, 6), "1400", {"unit": "ARS"}),
        ],
    )


@pytest.mark.usefixtures("dollar_series")
def test_list_indicators_aggregates_sources_and_coverage(client: TestClient) -> None:
    response = client.get("/indicators")
    assert response.status_code == OK

    by_code = {item["indicator_code"]: item for item in response.json()}
    blue = by_code["dollar_blue"]
    assert sorted(blue["sources"]) == ["argentinadatos", "dolarapi"]
    assert blue["count"] == 3
    assert blue["first_date"] == "2026-01-05"
    assert blue["last_date"] == "2026-01-06"


@pytest.mark.usefixtures("dollar_series")
def test_indicator_sources_reports_latest_value_per_source(client: TestClient) -> None:
    response = client.get("/indicators/dollar_blue/sources")
    assert response.status_code == OK

    by_source = {item["source"]: item for item in response.json()}
    assert by_source["dolarapi"]["count"] == 2
    assert Decimal(by_source["dolarapi"]["latest_value"]) == Decimal(1520)
    assert by_source["dolarapi"]["last_date"] == "2026-01-06"
    assert by_source["argentinadatos"]["count"] == 1
    assert Decimal(by_source["argentinadatos"]["latest_value"]) == Decimal(1510)


def test_indicator_sources_404_for_unknown_code(client: TestClient) -> None:
    assert client.get("/indicators/no_existe/sources").status_code == NOT_FOUND


@pytest.mark.usefixtures("dollar_series")
def test_series_filters_by_source_and_date_range(client: TestClient) -> None:
    response = client.get(
        "/indicators/dollar_blue",
        params={"source": "dolarapi", "date_from": "2026-01-06"},
    )
    assert response.status_code == OK

    points = response.json()["points"]
    assert len(points) == 1
    assert points[0]["source"] == "dolarapi"
    assert points[0]["date"] == "2026-01-06"


@pytest.mark.usefixtures("dollar_series")
def test_series_respects_descending_order(client: TestClient) -> None:
    response = client.get("/indicators/dollar_blue", params={"order": "desc"})
    dates = [point["date"] for point in response.json()["points"]]
    assert dates == sorted(dates, reverse=True)


@pytest.mark.usefixtures("dollar_series")
def test_series_rejects_unknown_order(client: TestClient) -> None:
    response = client.get("/indicators/dollar_blue", params={"order": "sideways"})
    assert response.status_code == UNPROCESSABLE


@pytest.mark.usefixtures("dollar_series")
def test_series_404_when_filters_match_nothing(client: TestClient) -> None:
    response = client.get("/indicators/dollar_blue", params={"date_from": "2030-01-01"})
    assert response.status_code == NOT_FOUND


@pytest.mark.usefixtures("dollar_series")
def test_csv_export_has_header_and_rows(client: TestClient) -> None:
    response = client.get("/indicators/dollar_blue/csv", params={"source": "dolarapi"})
    assert response.status_code == OK
    assert "text/csv" in response.headers["content-type"]
    assert "dollar_blue.csv" in response.headers["content-disposition"]

    rows = list(csv.reader(io.StringIO(response.text)))
    assert rows[0] == ["date", "indicator_code", "source", "value"]
    assert [row[0] for row in rows[1:]] == ["2026-01-05", "2026-01-06"]
    assert {row[2] for row in rows[1:]} == {"dolarapi"}


def test_variation_compounds_monthly_rate_indicators(
    client: TestClient, db_session: Session
) -> None:
    seed(
        db_session,
        [
            ("cpi_monthly", "argentinadatos", date(2026, 1, 31), "10", PERCENT_META),
            ("cpi_monthly", "argentinadatos", date(2026, 2, 28), "10", PERCENT_META),
        ],
    )

    response = client.get("/indicators/cpi_monthly/variation", params={"date_from": "2026-01-01"})
    assert response.status_code == OK

    payload = response.json()
    assert payload["method"] == "COMPOUNDED"
    assert payload["points"] == 2
    assert Decimal(payload["change_pct"]) == Decimal("21.00")


def test_variation_uses_endpoints_for_level_indicators(
    client: TestClient, db_session: Session
) -> None:
    seed(
        db_session,
        [
            ("country_risk", "argentinadatos", date(2026, 1, 1), "800", {"unit": "puntos"}),
            ("country_risk", "argentinadatos", date(2026, 2, 1), "600", {"unit": "puntos"}),
        ],
    )

    payload = client.get(
        "/indicators/country_risk/variation", params={"date_from": "2026-01-01"}
    ).json()
    assert payload["method"] == "ENDPOINTS"
    assert Decimal(payload["change_pct"]) == Decimal(-25)


@pytest.mark.usefixtures("dollar_series")
def test_variation_404_when_single_point_in_window(client: TestClient) -> None:
    response = client.get(
        "/indicators/dollar_blue/variation",
        params={"date_from": "2026-01-06", "source": "argentinadatos"},
    )
    assert response.status_code == NOT_FOUND
