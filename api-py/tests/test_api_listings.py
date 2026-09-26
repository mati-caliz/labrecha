from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from labrecha_db import (
    GazetteSummary,
    Holiday,
    NewsArticle,
    PoliticalEvent,
    RentByNeighborhood,
    RevenueSharingShare,
    Senator,
    TaxChange,
)

OK = 200


def _get(client: TestClient, path: str, **params: object) -> list[dict[str, object]]:
    response = client.get(path, params=params)
    assert response.status_code == OK, response.text
    body: list[dict[str, object]] = response.json()
    return body


@pytest.fixture
def political_events(db_session: Session) -> None:
    db_session.add_all(
        [
            PoliticalEvent(date=date(2026, 1, 10), title="Paro general", category="protesta"),
            PoliticalEvent(
                date=date(2026, 3, 1), title="Apertura de sesiones", category="congreso"
            ),
            PoliticalEvent(date=date(2026, 5, 20), title="Marcha federal", category="protesta"),
        ]
    )
    db_session.commit()


@pytest.mark.usefixtures("political_events")
@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ({}, ["Paro general", "Apertura de sesiones", "Marcha federal"]),
        ({"date_from": "2026-02-01", "date_to": "2026-04-01"}, ["Apertura de sesiones"]),
        ({"category": "protesta"}, ["Paro general", "Marcha federal"]),
    ],
)
def test_political_events(
    client: TestClient, params: dict[str, object], expected: list[str]
) -> None:
    assert [event["title"] for event in _get(client, "/political-events", **params)] == expected


@pytest.fixture
def holidays(db_session: Session) -> None:
    db_session.add_all(
        [
            Holiday(date=date(2025, 12, 25), name="Navidad", is_fixed=True),
            Holiday(date=date(2026, 5, 25), name="Revolución de Mayo", is_fixed=True),
            Holiday(date=date(2026, 7, 9), name="Independencia", is_fixed=True),
        ]
    )
    db_session.commit()


@pytest.mark.usefixtures("holidays")
@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ({"year": 2026}, ["Revolución de Mayo", "Independencia"]),
        ({"date_from": "2026-06-01"}, ["Independencia"]),
        ({"date_to": "2026-01-01"}, ["Navidad"]),
    ],
)
def test_holidays(client: TestClient, params: dict[str, object], expected: list[str]) -> None:
    assert [holiday["name"] for holiday in _get(client, "/holidays", **params)] == expected


def _article(title: str, source: str, category: str, day: int) -> NewsArticle:
    return NewsArticle(
        title=title,
        content="cuerpo",
        summary=f"resumen de {title}",
        source=source,
        source_url=f"https://{source}.example/{day}",
        country="AR",
        category=category,
        published_date=datetime(2026, 6, day, tzinfo=UTC),
    )


@pytest.fixture
def news(db_session: Session) -> None:
    db_session.add_all(
        [
            _article("Suba del dólar", "diario-a", "economia", 1),
            _article("Sesión especial", "diario-b", "politica", 2),
            _article("Inflación de mayo", "diario-a", "economia", 3),
        ]
    )
    db_session.commit()


@pytest.mark.usefixtures("news")
@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ({}, ["Inflación de mayo", "Sesión especial", "Suba del dólar"]),
        ({"source": "diario-a", "limit": 1}, ["Inflación de mayo"]),
        ({"category": "politica"}, ["Sesión especial"]),
    ],
)
def test_news(client: TestClient, params: dict[str, object], expected: list[str]) -> None:
    assert [article["title"] for article in _get(client, "/news", **params)] == expected


@pytest.fixture
def tax_changes(db_session: Session) -> None:
    db_session.add_all(
        [
            TaxChange(
                regulation_id="R-1",
                date=date(2026, 1, 5),
                change_type="alta",
                tax_name="Tasa",
                jurisdiction="nacional",
                title="Nueva tasa",
                url="https://boletin.example/1",
            ),
            TaxChange(
                regulation_id="R-2",
                date=date(2026, 2, 5),
                change_type="baja",
                tax_name="Sellos",
                jurisdiction="provincial",
                title="Baja de sellos",
                url="https://boletin.example/2",
            ),
        ]
    )
    db_session.commit()


@pytest.mark.usefixtures("tax_changes")
@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ({}, ["R-2", "R-1"]),
        ({"change_type": "alta"}, ["R-1"]),
        ({"jurisdiction": "provincial"}, ["R-2"]),
    ],
)
def test_tax_changes(client: TestClient, params: dict[str, object], expected: list[str]) -> None:
    listed = _get(client, "/taxes/changes", **params)
    assert [change["regulation_id"] for change in listed] == expected


@pytest.fixture
def gazette(db_session: Session) -> None:
    db_session.add_all(
        [
            GazetteSummary(
                regulation_id="G-1",
                date=date(2026, 1, 5),
                section="primera",
                title="Decreto",
                summary="Punto uno\nPunto dos",
                category="economia",
                url="https://bo.example/1",
            ),
            GazetteSummary(
                regulation_id="G-2",
                date=date(2026, 2, 5),
                section="primera",
                title="Resolución",
                summary="Único punto",
                category="salud",
                url="https://bo.example/2",
            ),
        ]
    )
    db_session.commit()


@pytest.mark.usefixtures("gazette")
def test_gazette_summaries_split_their_points(client: TestClient) -> None:
    everything = _get(client, "/gazette/summaries")
    economy = _get(client, "/gazette/summaries", category="economia")

    assert [item["regulation_id"] for item in everything] == ["G-2", "G-1"]
    assert [item["summary"] for item in economy] == [["Punto uno", "Punto dos"]]


@pytest.fixture
def senators(db_session: Session) -> None:
    db_session.add_all(
        [
            Senator(
                senator_id="1", last_name="Alvarez", first_name="Ana", bloc="Azul", province="Salta"
            ),
            Senator(
                senator_id="2",
                last_name="Benítez",
                first_name="Bruno",
                bloc="Rojo",
                province="Jujuy",
            ),
            Senator(
                senator_id="3",
                last_name="Castro",
                first_name="Carla",
                bloc="Azul",
                province="Jujuy",
            ),
        ]
    )
    db_session.commit()


@pytest.mark.usefixtures("senators")
@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ({}, ["1", "2", "3"]),
        ({"bloc": "Azul"}, ["1", "3"]),
        ({"province": "Jujuy"}, ["2", "3"]),
    ],
)
def test_senate_members(client: TestClient, params: dict[str, object], expected: list[str]) -> None:
    listed = _get(client, "/senate/members", **params)
    assert [senator["senator_id"] for senator in listed] == expected


@pytest.mark.usefixtures("senators")
def test_senate_blocs_are_ranked_by_size(client: TestClient) -> None:
    assert _get(client, "/senate/blocs") == [
        {"bloc": "Azul", "count": 2},
        {"bloc": "Rojo", "count": 1},
    ]


def test_rent_shows_only_the_latest_month_of_each_neighborhood(
    client: TestClient, db_session: Session
) -> None:
    db_session.add_all(
        [
            RentByNeighborhood(neighborhood="Palermo", date=date(2026, 4, 1), price=Decimal(900)),
            RentByNeighborhood(neighborhood="Palermo", date=date(2026, 5, 1), price=Decimal(950)),
            RentByNeighborhood(neighborhood="Flores", date=date(2026, 5, 1), price=Decimal(600)),
        ]
    )
    db_session.commit()

    listed = _get(client, "/housing/rent-by-neighborhood")

    assert [(row["neighborhood"], row["date"]) for row in listed] == [
        ("Palermo", "2026-05-01"),
        ("Flores", "2026-05-01"),
    ]


def test_revenue_sharing_shares_add_up_to_one_hundred(
    client: TestClient, db_session: Session
) -> None:
    db_session.add_all(
        [
            RevenueSharingShare(province="Buenos Aires", coefficient=Decimal(3), source="ley"),
            RevenueSharingShare(province="Córdoba", coefficient=Decimal(1), source="ley"),
        ]
    )
    db_session.commit()

    listed = _get(client, "/revenue-sharing")

    assert [(row["province"], row["share_pct"]) for row in listed] == [
        ("Buenos Aires", "75.00"),
        ("Córdoba", "25.00"),
    ]


def test_revenue_sharing_without_coefficients_is_empty(client: TestClient) -> None:
    assert _get(client, "/revenue-sharing") == []


def test_revenue_sharing_with_zero_total_reports_zero_shares(
    client: TestClient, db_session: Session
) -> None:
    db_session.add(
        RevenueSharingShare(province="Tierra del Fuego", coefficient=Decimal(0), source="ley")
    )
    db_session.commit()

    assert [row["share_pct"] for row in _get(client, "/revenue-sharing")] == ["0"]
