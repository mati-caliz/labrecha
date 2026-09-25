from __future__ import annotations

from datetime import date
from pathlib import Path

import httpx
import pytest

from labrecha_db import CHAMBER_SENATE
from labrecha_scraper.connectors.senate_votes import SenateVotesConnector

FIXTURES = Path(__file__).parent / "fixtures"
SESSION_DATE = date(2026, 2, 11)
ACTA_ID = "2623"


def _fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


@pytest.fixture
def connector() -> SenateVotesConnector:
    return SenateVotesConnector()


@pytest.fixture
def detail() -> str:
    return _fixture("senate_acta_detail.html")


def test_the_listing_pairs_every_acta_with_its_session_date(
    connector: SenateVotesConnector,
) -> None:
    actas = connector._parse_listing(_fixture("senate_actas_listing.html"), 2026)

    assert actas == [
        ("2623", SESSION_DATE),
        ("2624", SESSION_DATE),
        ("2625", SESSION_DATE),
    ]


def test_a_listing_without_results_table_fails_loudly(connector: SenateVotesConnector) -> None:
    with pytest.raises(ValueError, match="tabla de resultados"):
        connector._parse_listing("<html><body>mantenimiento</body></html>", 2026)


def test_an_invalid_listing_is_downloaded_again(
    connector: SenateVotesConnector,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    responses = iter(
        ["<html><body>mantenimiento</body></html>", _fixture("senate_actas_listing.html")]
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=next(responses), request=request)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    monkeypatch.setattr("labrecha_scraper.http_client.time.sleep", lambda _: None)
    monkeypatch.setattr(
        connector,
        "_pending_scope",
        lambda: ([2026], {"S-2623", "S-2624", "S-2625"}),
    )
    monkeypatch.setattr(connector, "build_client", lambda: client)

    result = connector.fetch()

    assert result.votes == []
    assert result.details == []


def test_the_acta_header_carries_what_the_senate_publishes(
    connector: SenateVotesConnector, detail: str
) -> None:
    vote = connector._parse_vote(detail, ACTA_ID, SESSION_DATE)

    assert vote["vote_record_id"] == "S-2623"
    assert vote["chamber"] == CHAMBER_SENATE
    assert vote["ballot_number"] == "1"
    assert vote["date"] == SESSION_DATE
    assert vote["time"] == "01:21"
    assert vote["result"] == "AFIRMATIVO"
    assert vote["vote_type"] == "EN GENERAL"
    assert vote["majority_type"] == "SIMPLE"
    assert vote["title"] == "Modernización Laboral. PE-159/25-PL, O.D. 699/2025"
    assert (vote["affirmative_votes"], vote["negative_votes"]) == (42, 30)
    assert (vote["abstentions"], vote["absents"]) == (0, 0)


def test_the_columns_that_only_deputies_publish_stay_empty(
    connector: SenateVotesConnector, detail: str
) -> None:
    vote = connector._parse_vote(detail, ACTA_ID, SESSION_DATE)

    assert vote["period_number"] is None
    assert vote["president_name"] is None
    assert vote["majority_base"] is None


def test_an_acta_without_its_tally_fails_loudly(connector: SenateVotesConnector) -> None:
    with pytest.raises(ValueError, match="sin conteo de"):
        connector._parse_vote("<html><body>Acta Nro: 1</body></html>", ACTA_ID, SESSION_DATE)


def test_every_senator_vote_gets_a_stable_id(connector: SenateVotesConnector, detail: str) -> None:
    details = connector._parse_senator_votes(detail, ACTA_ID)

    assert [row["vote_detail_id"] for row in details] == [
        "S-2623-540",
        "S-2623-554",
        "S-2623-519",
    ]
    assert all(row["vote_record_id"] == "S-2623" for row in details)
    assert details[0]["legislator_name"] == "MENDOZA, SANDRA MARIELA"
    assert details[0]["bloc"] == "CONVICCIÓN FEDERAL"
    assert details[0]["district"] == "TUCUMÁN"
    assert details[0]["vote"] == "NEGATIVO"


def test_an_acta_rendered_twice_keeps_one_vote_per_senator(
    connector: SenateVotesConnector,
) -> None:
    details = connector._parse_senator_votes(
        _fixture("senate_acta_detail_doble_render.html"), "2721"
    )

    assert [row["vote_detail_id"] for row in details] == [
        "S-2721-nb839a395",
        "S-2721-294",
        "S-2721-n3dc9ab77",
    ]
    assert [row["legislator_name"] for row in details] == [
        "ESTENSSORO, MARÍA EUGENIA",
        "MAYANS, JOSÉ MIGUEL ÁNGEL",
        "PICHETTO, MIGUEL ÁNGEL",
    ]


def test_an_acta_without_senator_votes_fails_loudly(connector: SenateVotesConnector) -> None:
    with pytest.raises(ValueError, match="sin votos por senador"):
        connector._parse_senator_votes("<html><body><tbody></tbody></body></html>", ACTA_ID)
