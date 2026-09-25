from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest

from labrecha_db import CHAMBER_DEPUTIES
from labrecha_scraper.connectors.hcdn_votes import HcdnVotesConnector

FIXTURES = Path(__file__).parent / "fixtures"
ACTA_ID = 3929


@pytest.fixture
def connector() -> HcdnVotesConnector:
    return HcdnVotesConnector()


@pytest.fixture
def acta() -> str:
    return (FIXTURES / "hcdn_acta.html").read_text(encoding="utf-8")


def test_the_scraped_acta_matches_what_the_open_dataset_published(
    connector: HcdnVotesConnector, acta: str
) -> None:
    # Los mismos valores que trae el acta 3929 del dataset de datos abiertos de HCDN: es
    # la prueba de que la plataforma web y el dataset congelado numeran las actas igual y
    # de que la serie sigue sin cortes donde el dataset dejó de actualizarse.
    vote = connector._parse_vote(acta, ACTA_ID)

    assert vote["vote_record_id"] == "3929"
    assert vote["chamber"] == CHAMBER_DEPUTIES
    assert vote["period_number"] == 137
    assert vote["meeting_number"] == "8"
    assert vote["ballot_number"] == "23"
    assert vote["date"] == date(2019, 11, 20)
    assert vote["time"] == "22:50"
    assert vote["result"] == "AFIRMATIVO"
    assert vote["president_name"] == "MONZÓ, Emilio"
    assert vote["majority_type"] == "Más de la mitad"
    assert vote["majority_base"] == "Votos Emitidos"
    assert (vote["affirmative_votes"], vote["negative_votes"]) == (170, 0)
    assert (vote["abstentions"], vote["absents"]) == (4, 82)


def test_the_title_drops_the_date_that_the_heading_nests_inside_it(
    connector: HcdnVotesConnector, acta: str
) -> None:
    title = connector._parse_vote(acta, ACTA_ID)["title"]

    assert title is not None
    assert title.startswith("Expediente 3138-D-2019.")
    assert title.endswith("Votación en General y Particular.")
    assert "22:50" not in title


def test_an_acta_without_its_tally_fails_loudly(connector: HcdnVotesConnector) -> None:
    heading = "<b>Período 137 - Reunión 8 - Acta 23</b>"

    with pytest.raises(ValueError, match="sin conteo de"):
        connector._parse_vote(heading, ACTA_ID)


def test_a_page_without_acta_heading_fails_loudly(connector: HcdnVotesConnector) -> None:
    with pytest.raises(ValueError, match="sin encabezado"):
        connector._parse_vote("<html><body>Consulta de Votaciones</body></html>", ACTA_ID)


def test_every_deputy_vote_is_keyed_by_the_deputy_not_by_row_order(
    connector: HcdnVotesConnector, acta: str
) -> None:
    details = connector._parse_deputy_votes(acta, ACTA_ID)

    assert [row["vote_detail_id"] for row in details] == [
        "3929-A4759",
        "3929-A50902",
        "3929-A51069",
    ]
    assert all(row["vote_record_id"] == "3929" for row in details)
    assert details[0]["legislator_name"] == "ABDALA DE MATARAZZO, Norma Amanda"
    assert details[0]["bloc"] == "Frente Cívico por Santiago"
    assert details[0]["district"] == "Santiago del Estero"
    assert details[0]["vote"] == "AFIRMATIVO"


def test_an_acta_without_deputy_votes_fails_loudly(connector: HcdnVotesConnector) -> None:
    with pytest.raises(ValueError, match="sin votos por diputado"):
        connector._parse_deputy_votes("<html><body><tbody></tbody></body></html>", ACTA_ID)
