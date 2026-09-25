from __future__ import annotations

from datetime import date
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from labrecha_db import IndicatorHistory

OK = 200
NOT_FOUND = 404


def seed(session: Session, rows: list[tuple[str, str, date, str]]) -> None:
    session.add_all(
        [
            IndicatorHistory(
                indicator_code=code,
                source=source,
                date=day,
                value=Decimal(value),
                meta={"unit": "%"},
            )
            for code, source, day, value in rows
        ]
    )
    session.commit()


def test_terms_split_series_by_presidential_mandate(
    client: TestClient, db_session: Session
) -> None:
    seed(
        db_session,
        [
            ("cpi_monthly", "argentinadatos", date(2019, 1, 31), "2"),
            ("cpi_monthly", "argentinadatos", date(2021, 1, 31), "4"),
            ("cpi_monthly", "argentinadatos", date(2024, 1, 31), "20"),
            ("cpi_monthly", "argentinadatos", date(2025, 1, 31), "2"),
        ],
    )

    payload = client.get("/terms/cpi_monthly").json()
    by_term = {term["term_id"]: term for term in payload["terms"]}

    assert payload["method"] == "COMPOUNDED"
    assert by_term["macri"]["points"] == 1
    assert by_term["alberto_fernandez"]["points"] == 1
    assert by_term["milei"]["points"] == 2
    assert Decimal(by_term["milei"]["change_pct"]) == Decimal("22.40")


def test_terms_use_endpoints_for_level_series(client: TestClient, db_session: Session) -> None:
    seed(
        db_session,
        [
            ("country_risk", "argentinadatos", date(2024, 1, 1), "2000"),
            ("country_risk", "argentinadatos", date(2025, 1, 1), "1000"),
        ],
    )

    payload = client.get("/terms/country_risk").json()
    milei = next(term for term in payload["terms"] if term["term_id"] == "milei")

    assert payload["method"] == "ENDPOINTS"
    assert Decimal(milei["change_pct"]) == Decimal(-50)
    assert Decimal(milei["average"]) == Decimal(1500)


def test_terms_pick_the_most_covered_source_when_none_is_given(
    client: TestClient, db_session: Session
) -> None:
    seed(
        db_session,
        [
            ("cpi_monthly", "argentinadatos", date(2024, 1, 31), "1"),
            ("cpi_monthly", "argentinadatos", date(2024, 2, 29), "1"),
            ("cpi_monthly", "iec_caba", date(2024, 1, 31), "9"),
        ],
    )

    payload = client.get("/terms/cpi_monthly").json()
    assert payload["source"] == "argentinadatos"


def test_terms_honour_an_explicit_source(client: TestClient, db_session: Session) -> None:
    seed(
        db_session,
        [
            ("cpi_monthly", "argentinadatos", date(2024, 1, 31), "1"),
            ("cpi_monthly", "argentinadatos", date(2024, 2, 29), "1"),
            ("cpi_monthly", "iec_caba", date(2024, 1, 31), "9"),
        ],
    )

    payload = client.get("/terms/cpi_monthly", params={"source": "iec_caba"}).json()
    assert payload["source"] == "iec_caba"
    assert sum(term["points"] for term in payload["terms"]) == 1


def test_terms_404_for_unknown_indicator(client: TestClient) -> None:
    assert client.get("/terms/no_existe").status_code == NOT_FOUND
