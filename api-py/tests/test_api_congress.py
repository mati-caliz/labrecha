from __future__ import annotations

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from labrecha_db import (
    CHAMBER_DEPUTIES,
    CHAMBER_SENATE,
    CongressVote,
    CongressVoteDetail,
    CongressVoteSummary,
    SanctionedLaw,
)

OK = 200
NOT_FOUND = 404
UNPROCESSABLE = 422

ATTENDANCE_THRESHOLD = 1000
PRESENT_IN_BIG_BLOC = 900
PRESENT_IN_SENATE_BLOC = 1000


def _vote(record_id: str, chamber: str, day: date, result: str, *, period: int) -> CongressVote:
    return CongressVote(
        vote_record_id=record_id,
        chamber=chamber,
        date=day,
        result=result,
        period_number=period,
        title=f"Votación {record_id}",
        affirmative_votes=130,
        negative_votes=100,
    )


@pytest.fixture
def votes(db_session: Session) -> None:
    db_session.add_all(
        [
            _vote("D-1", CHAMBER_DEPUTIES, date(2026, 3, 1), "AFIRMATIVO", period=144),
            _vote("D-2", CHAMBER_DEPUTIES, date(2026, 5, 1), "NEGATIVO", period=144),
            _vote("S-1", CHAMBER_SENATE, date(2026, 4, 1), "AFIRMATIVO", period=143),
            CongressVoteSummary(vote_record_id="D-1", summary="Presupuesto 2027", topic="economia"),
            CongressVoteDetail(
                vote_detail_id="1",
                vote_record_id="D-1",
                legislator_name="Pérez",
                bloc="Azul",
                district="CABA",
                vote="AFIRMATIVO",
            ),
            CongressVoteDetail(
                vote_detail_id="2",
                vote_record_id="D-1",
                legislator_name="Gómez",
                bloc="Rojo",
                district="Salta",
                vote="NEGATIVO",
            ),
            CongressVoteDetail(
                vote_detail_id="3",
                vote_record_id="D-1",
                legislator_name="Díaz",
                bloc="Azul",
                district="Jujuy",
                vote="AUSENTE",
            ),
        ]
    )
    db_session.commit()


def _ids(response_json: list[dict[str, object]]) -> list[object]:
    return [vote["vote_record_id"] for vote in response_json]


@pytest.mark.usefixtures("votes")
def test_votes_are_listed_newest_first_with_their_summary(client: TestClient) -> None:
    response = client.get("/congress/votes")

    assert response.status_code == OK
    listed = response.json()
    assert _ids(listed) == ["D-2", "S-1", "D-1"]
    assert listed[2]["summary"] == "Presupuesto 2027"
    assert listed[2]["topic"] == "economia"
    assert listed[0]["summary"] is None


@pytest.mark.usefixtures("votes")
@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ({"date_from": "2026-04-01"}, ["D-2", "S-1"]),
        ({"date_to": "2026-04-01"}, ["S-1", "D-1"]),
        ({"result": "AFIRMATIVO"}, ["S-1", "D-1"]),
        ({"chamber": CHAMBER_SENATE}, ["S-1"]),
        ({"period_number": 144, "limit": 1, "offset": 1}, ["D-1"]),
    ],
)
def test_vote_filters(client: TestClient, params: dict[str, object], expected: list[str]) -> None:
    response = client.get("/congress/votes", params=params)

    assert response.status_code == OK
    assert _ids(response.json()) == expected


@pytest.mark.parametrize("path", ["/congress/votes", "/congress/attendance"])
def test_unknown_chamber_is_rejected(client: TestClient, path: str) -> None:
    response = client.get(path, params={"chamber": "concejo"})

    assert response.status_code == UNPROCESSABLE
    assert "cámara desconocida" in response.json()["detail"]


@pytest.mark.usefixtures("votes")
def test_single_vote_with_and_without_summary(client: TestClient) -> None:
    with_summary = client.get("/congress/votes/D-1").json()
    without_summary = client.get("/congress/votes/S-1").json()

    assert with_summary["summary"] == "Presupuesto 2027"
    assert without_summary["summary"] is None
    assert client.get("/congress/votes/X-9").status_code == NOT_FOUND


@pytest.mark.usefixtures("votes")
def test_vote_details_filter_by_vote_and_bloc(client: TestClient) -> None:
    every_detail = client.get("/congress/votes/D-1/details").json()
    absents = client.get("/congress/votes/D-1/details", params={"vote": "AUSENTE"}).json()
    red_bloc = client.get("/congress/votes/D-1/details", params={"bloc": "Rojo"}).json()

    assert [detail["legislator_name"] for detail in every_detail] == ["Díaz", "Pérez", "Gómez"]
    assert [detail["legislator_name"] for detail in absents] == ["Díaz"]
    assert [detail["legislator_name"] for detail in red_bloc] == ["Gómez"]
    assert client.get("/congress/votes/X-9/details").status_code == NOT_FOUND


def _bloc_votes(session: Session, *, prefix: str, record_id: str, bloc: str, present: int) -> None:
    session.add_all(
        CongressVoteDetail(
            vote_detail_id=f"{prefix}{index}",
            vote_record_id=record_id,
            bloc=bloc,
            vote="AFIRMATIVO" if index < present else "AUSENTE",
        )
        for index in range(ATTENDANCE_THRESHOLD)
    )


@pytest.fixture
def attendance(db_session: Session) -> None:
    db_session.add_all(
        [
            _vote("D-1", CHAMBER_DEPUTIES, date(2026, 3, 1), "AFIRMATIVO", period=144),
            _vote("S-1", CHAMBER_SENATE, date(2026, 4, 1), "AFIRMATIVO", period=143),
            CongressVoteDetail(vote_detail_id="chico", vote_record_id="D-1", bloc="Chico"),
            CongressVoteDetail(vote_detail_id="sin-bloque", vote_record_id="D-1", bloc=None),
        ]
    )
    _bloc_votes(db_session, prefix="d", record_id="D-1", bloc="Grande", present=PRESENT_IN_BIG_BLOC)
    _bloc_votes(
        db_session, prefix="s", record_id="S-1", bloc="Grande", present=PRESENT_IN_SENATE_BLOC
    )
    db_session.commit()


@pytest.mark.usefixtures("attendance")
def test_attendance_is_per_chamber_and_skips_small_blocs(client: TestClient) -> None:
    rows = client.get("/congress/attendance").json()
    deputies = client.get("/congress/attendance", params={"chamber": CHAMBER_DEPUTIES}).json()

    assert [(row["chamber"], row["bloc"], row["attendance_pct"]) for row in rows] == [
        (CHAMBER_SENATE, "Grande", "100.0"),
        (CHAMBER_DEPUTIES, "Grande", "90.0"),
    ]
    assert [row["chamber"] for row in deputies] == [CHAMBER_DEPUTIES]
    assert deputies[0]["present_votes"] == PRESENT_IN_BIG_BLOC


@pytest.fixture
def laws(db_session: Session) -> None:
    db_session.add_all(
        [
            SanctionedLaw(
                law_number="27800", sanctioning_chamber="diputados", final_sanction=date(2026, 6, 1)
            ),
            SanctionedLaw(
                law_number="27700", sanctioning_chamber="senado", final_sanction=date(2025, 6, 1)
            ),
            SanctionedLaw(law_number="27600", sanctioning_chamber="senado", final_sanction=None),
        ]
    )
    db_session.commit()


@pytest.mark.usefixtures("laws")
@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ({}, ["27800", "27700", "27600"]),
        ({"date_from": "2026-01-01"}, ["27800"]),
        ({"date_to": "2026-01-01"}, ["27700"]),
        ({"chamber": "senado", "limit": 1}, ["27700"]),
    ],
)
def test_sanctioned_laws(
    client: TestClient, params: dict[str, object], expected: list[str]
) -> None:
    response = client.get("/congress/laws", params=params)

    assert response.status_code == OK
    assert [law["law_number"] for law in response.json()] == expected
