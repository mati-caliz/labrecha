from __future__ import annotations

from collections.abc import Mapping
from datetime import date, timedelta
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from labrecha_api.clock import today_in_argentina
from labrecha_api.routers.gaps import RECENT_WINDOW_DAYS
from labrecha_db import IndicatorHistory

OK = 200
NOT_FOUND = 404

PERCENT = {"unit": "%"}
PESOS = {"unit": "ARS"}
MILLIONS = {"unit": "ARS_millones"}
NO_UNIT: dict[str, object] = {}


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


def test_gap_uses_latest_date_shared_by_two_sources(
    client: TestClient, db_session: Session
) -> None:
    seed(
        db_session,
        [
            ("dollar_blue", "dolarapi", date(2026, 1, 5), "1000", PESOS),
            ("dollar_blue", "argentinadatos", date(2026, 1, 5), "1100", PESOS),
            ("dollar_blue", "dolarapi", date(2026, 1, 6), "1200", PESOS),
            ("dollar_blue", "argentinadatos", date(2026, 1, 6), "1500", PESOS),
            ("dollar_blue", "dolarapi", date(2026, 1, 7), "1250", PESOS),
        ],
    )

    gap = client.get("/gaps/dollar_blue").json()
    assert gap["date"] == "2026-01-06"
    assert gap["higher_source"] == "argentinadatos"
    assert gap["lower_source"] == "dolarapi"
    assert Decimal(gap["spread"]) == Decimal(300)
    assert gap["gap_pct"] == 25.0
    assert gap["unit"] == "ARS"


def test_sources_with_a_different_unit_are_excluded_with_a_reason(
    client: TestClient, db_session: Session
) -> None:
    seed(
        db_session,
        [
            ("tax_revenue", "datosgobar", date(2026, 1, 31), "100", MILLIONS),
            ("tax_revenue", "iaraf", date(2026, 1, 31), "110", MILLIONS),
            ("tax_revenue", "otra", date(2026, 1, 31), "100000000", PESOS),
        ],
    )

    gap = client.get("/gaps/tax_revenue").json()
    assert gap["unit"] == "ARS_millones"
    assert {measurement["source"] for measurement in gap["measurements"]} == {
        "datosgobar",
        "iaraf",
    }
    excluded = {item["source"]: item["reason"] for item in gap["excluded_sources"]}
    assert "otra" in excluded
    assert "unidad distinta" in excluded["otra"]


def test_source_without_declared_unit_is_excluded(client: TestClient, db_session: Session) -> None:
    seed(
        db_session,
        [
            ("cpi_monthly", "argentinadatos", date(2026, 1, 31), "2.9", PERCENT),
            ("cpi_monthly", "iec_caba", date(2026, 1, 31), "3.06", PERCENT),
            ("cpi_monthly", "sin_unidad", date(2026, 1, 31), "2.5", NO_UNIT),
        ],
    )

    gap = client.get("/gaps/cpi_monthly").json()
    excluded = {item["source"]: item["reason"] for item in gap["excluded_sources"]}
    assert excluded["sin_unidad"] == "sin unidad declarada en la medición"
    assert len(gap["measurements"]) == 2


def test_gap_404_when_only_one_source_declares_the_unit(
    client: TestClient, db_session: Session
) -> None:
    seed(
        db_session,
        [
            ("emae", "datosgobar", date(2026, 1, 1), "150", {"unit": "indice"}),
            ("emae", "otra", date(2026, 1, 1), "151", NO_UNIT),
        ],
    )

    assert client.get("/gaps/emae").status_code == NOT_FOUND


def test_gap_404_when_sources_never_share_a_date(client: TestClient, db_session: Session) -> None:
    seed(
        db_session,
        [
            ("unemployment", "datosgobar", date(2026, 1, 1), "6.5", PERCENT),
            ("unemployment", "otra", date(2026, 2, 1), "7.1", PERCENT),
        ],
    )

    assert client.get("/gaps/unemployment").status_code == NOT_FOUND


def test_ranking_is_sorted_by_gap_and_respects_limit(
    client: TestClient, db_session: Session
) -> None:
    seed(
        db_session,
        [
            ("dollar_blue", "a", date(2026, 1, 6), "100", PESOS),
            ("dollar_blue", "b", date(2026, 1, 6), "110", PESOS),
            ("country_risk", "a", date(2026, 1, 6), "100", {"unit": "puntos"}),
            ("country_risk", "b", date(2026, 1, 6), "200", {"unit": "puntos"}),
            ("emae", "a", date(2026, 1, 6), "100", {"unit": "indice"}),
            ("emae", "b", date(2026, 1, 6), "101", {"unit": "indice"}),
        ],
    )

    ranked = client.get("/gaps").json()
    assert [item["indicator_code"] for item in ranked] == ["country_risk", "dollar_blue", "emae"]

    limited = client.get("/gaps", params={"limit": 1}).json()
    assert [item["indicator_code"] for item in limited] == ["country_risk"]


def test_ranking_does_not_let_a_near_zero_percentage_inflate_its_way_to_the_top(
    client: TestClient, db_session: Session
) -> None:
    seed(
        db_session,
        [
            ("financial_balance", "a", date(2026, 1, 6), "0.1", PERCENT),
            ("financial_balance", "b", date(2026, 1, 6), "0.4", PERCENT),
            ("dollar_blue", "a", date(2026, 1, 6), "1000", PESOS),
            ("dollar_blue", "b", date(2026, 1, 6), "1400", PESOS),
        ],
    )

    ranked = client.get("/gaps").json()

    assert [item["indicator_code"] for item in ranked] == ["dollar_blue", "financial_balance"]

    limited = client.get("/gaps", params={"limit": 1}).json()
    assert [item["indicator_code"] for item in limited] == ["dollar_blue"]


def test_ranking_between_percent_indicators_goes_by_points(
    client: TestClient, db_session: Session
) -> None:
    seed(
        db_session,
        [
            ("cpi_monthly", "a", date(2026, 1, 6), "40.0", PERCENT),
            ("cpi_monthly", "b", date(2026, 1, 6), "45.0", PERCENT),
            ("inflation_expectations_rem", "a", date(2026, 1, 6), "1.0", PERCENT),
            ("inflation_expectations_rem", "b", date(2026, 1, 6), "1.5", PERCENT),
        ],
    )

    ranked = client.get("/gaps").json()

    assert [item["indicator_code"] for item in ranked] == [
        "cpi_monthly",
        "inflation_expectations_rem",
    ]


def test_min_sources_filter_excludes_pairs(client: TestClient, db_session: Session) -> None:
    seed(
        db_session,
        [
            ("dollar_blue", "a", date(2026, 1, 6), "100", PESOS),
            ("dollar_blue", "b", date(2026, 1, 6), "110", PESOS),
            ("cpi_monthly", "a", date(2026, 1, 6), "2", PERCENT),
            ("cpi_monthly", "b", date(2026, 1, 6), "3", PERCENT),
            ("cpi_monthly", "c", date(2026, 1, 6), "4", PERCENT),
        ],
    )

    codes = [
        item["indicator_code"] for item in client.get("/gaps", params={"min_sources": 3}).json()
    ]
    assert codes == ["cpi_monthly"]


def test_percent_indicator_reports_spread_in_points(
    client: TestClient, db_session: Session
) -> None:
    seed(
        db_session,
        [
            ("cpi_monthly", "argentinadatos", date(2026, 1, 31), "2.90", PERCENT),
            ("cpi_monthly", "dpec_san_luis", date(2026, 1, 31), "2.47", PERCENT),
            ("cpi_monthly", "ipecd_chaco", date(2026, 1, 31), "3.07", PERCENT),
        ],
    )

    gap = client.get("/gaps/cpi_monthly").json()
    assert gap["higher_source"] == "ipecd_chaco"
    assert gap["lower_source"] == "dpec_san_luis"
    assert Decimal(gap["spread"]) == Decimal("0.60")
    assert len(gap["measurements"]) == 3


def test_ranking_ignores_pairs_that_stopped_measuring_long_ago(
    client: TestClient, db_session: Session
) -> None:
    stale = today_in_argentina() - timedelta(days=RECENT_WINDOW_DAYS + 30)
    fresh = today_in_argentina() - timedelta(days=10)
    seed(
        db_session,
        [
            ("emae", "a", stale, "100", {"unit": "indice"}),
            ("emae", "b", stale, "200", {"unit": "indice"}),
            ("dollar_blue", "a", fresh, "100", PESOS),
            ("dollar_blue", "b", fresh, "110", PESOS),
        ],
    )

    codes = [item["indicator_code"] for item in client.get("/gaps").json()]
    assert codes == ["dollar_blue"]


def test_lookup_by_code_still_sees_the_whole_history(
    client: TestClient, db_session: Session
) -> None:
    stale = today_in_argentina() - timedelta(days=RECENT_WINDOW_DAYS + 30)
    seed(
        db_session,
        [
            ("emae", "a", stale, "100", {"unit": "indice"}),
            ("emae", "b", stale, "200", {"unit": "indice"}),
        ],
    )

    gap = client.get("/gaps/emae").json()
    assert gap["date"] == stale.isoformat()
    assert Decimal(gap["spread"]) == Decimal(100)


def test_gap_history_tracks_the_spread_over_time(client: TestClient, db_session: Session) -> None:
    seed(
        db_session,
        [
            ("dollar_blue", "a", date(2026, 1, 5), "1000", PESOS),
            ("dollar_blue", "b", date(2026, 1, 5), "1100", PESOS),
            ("dollar_blue", "a", date(2026, 1, 6), "1000", PESOS),
            ("dollar_blue", "b", date(2026, 1, 6), "1500", PESOS),
            ("dollar_blue", "a", date(2026, 1, 7), "1000", PESOS),
            ("dollar_blue", "b", date(2026, 1, 7), "1010", PESOS),
        ],
    )

    history = client.get("/gaps/dollar_blue/history").json()

    assert [point["date"] for point in history["points"]] == [
        "2026-01-05",
        "2026-01-06",
        "2026-01-07",
    ]
    assert history["widest"]["date"] == "2026-01-06"
    assert Decimal(history["widest"]["spread"]) == Decimal(500)
    assert history["narrowest"]["date"] == "2026-01-07"
    assert history["latest"]["date"] == "2026-01-07"
    assert history["unit"] == "ARS"


def test_gap_history_skips_dates_with_a_single_source(
    client: TestClient, db_session: Session
) -> None:
    seed(
        db_session,
        [
            ("dollar_blue", "a", date(2026, 1, 5), "1000", PESOS),
            ("dollar_blue", "a", date(2026, 1, 6), "1000", PESOS),
            ("dollar_blue", "b", date(2026, 1, 6), "1200", PESOS),
        ],
    )

    history = client.get("/gaps/dollar_blue/history").json()

    assert [point["date"] for point in history["points"]] == ["2026-01-06"]
    assert history["points"][0]["sources"] == 2


def test_gap_history_404_without_two_comparable_sources(
    client: TestClient, db_session: Session
) -> None:
    seed(
        db_session,
        [
            ("emae", "a", date(2026, 1, 5), "100", {"unit": "indice"}),
            ("emae", "b", date(2026, 1, 5), "101", NO_UNIT),
        ],
    )

    assert client.get("/gaps/emae/history").status_code == NOT_FOUND


def test_percent_history_ranks_by_points_not_by_ratio(
    client: TestClient, db_session: Session
) -> None:
    seed(
        db_session,
        [
            ("cpi_monthly", "a", date(2026, 1, 31), "1.0", PERCENT),
            ("cpi_monthly", "b", date(2026, 1, 31), "2.0", PERCENT),
            ("cpi_monthly", "a", date(2026, 2, 28), "40.0", PERCENT),
            ("cpi_monthly", "b", date(2026, 2, 28), "43.0", PERCENT),
        ],
    )

    history = client.get("/gaps/cpi_monthly/history").json()

    assert history["widest"]["date"] == "2026-02-28"
    assert Decimal(history["widest"]["spread"]) == Decimal("3.0")
    assert history["narrowest"]["date"] == "2026-01-31"


def test_level_history_still_ranks_by_relative_gap(client: TestClient, db_session: Session) -> None:
    seed(
        db_session,
        [
            ("dollar_blue", "a", date(2020, 1, 5), "100", PESOS),
            ("dollar_blue", "b", date(2020, 1, 5), "200", PESOS),
            ("dollar_blue", "a", date(2026, 1, 5), "10000", PESOS),
            ("dollar_blue", "b", date(2026, 1, 5), "10500", PESOS),
        ],
    )

    history = client.get("/gaps/dollar_blue/history").json()

    assert history["widest"]["date"] == "2020-01-05"
    assert history["narrowest"]["date"] == "2026-01-05"
