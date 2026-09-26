from __future__ import annotations

import io
import json
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, Self
from urllib.error import URLError

import pytest
from fastapi import HTTPException

from labrecha_api.routers import rates

if TYPE_CHECKING:
    from types import TracebackType
    from urllib.request import Request

UNAVAILABLE = 503


class FakeResponse(io.BytesIO):
    def __init__(self, payload: object) -> None:
        super().__init__(json.dumps(payload).encode())
        self.headers = {"Age": "12"}

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self.close()


def serve(monkeypatch: pytest.MonkeyPatch, payload: object) -> list[str]:
    requested: list[str] = []

    def fake_urlopen(request: Request, timeout: int) -> FakeResponse:
        requested.append(request.full_url)
        assert timeout > 0
        return FakeResponse(payload)

    monkeypatch.setattr(rates, "urlopen", fake_urlopen)
    return requested


def test_wallets_keep_only_peso_yields_sorted_from_best(monkeypatch: pytest.MonkeyPatch) -> None:
    requested = serve(
        monkeypatch,
        [
            {
                "entidad": "mercadopago",
                "rendimientos": [
                    {"moneda": "ARS", "apy": 30.5, "fecha": "2026-09-01", "bonusValue": 5},
                    {"moneda": "USD", "apy": 2, "fecha": "2026-09-01"},
                ],
            },
            {
                "entidad": "uala",
                "rendimientos": [
                    {"moneda": "ARS", "apy": 32, "fecha": "2026-09-02"},
                    {"moneda": "ARS", "apy": None, "fecha": "2026-09-02"},
                ],
            },
            {"entidad": "sin datos"},
        ],
    )

    rows = rates.wallets()

    assert requested == [f"https://{rates.API_HOST_AND_PATH}/rendimientos"]
    assert [row.id for row in rows] == ["uala-ars", "mercadopago-ars"]
    assert rows[0].updated_at == date(2026, 9, 2)
    assert rows[1].details == {"bono": 5}
    assert rows[0].details == {}


def test_fixed_term_converts_to_percent_and_adds_the_non_client_rate(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    serve(
        monkeypatch,
        [
            {
                "entidad": "banco a",
                "tnaClientes": 0.29,
                "tnaNoClientes": 0.25,
                "enlace": "https://a",
            },
            {"entidad": "banco b", "tnaClientes": 0.31},
            {"entidad": "banco c", "tnaClientes": None},
        ],
    )

    rows = rates.fixed_term()

    assert [row.name for row in rows] == ["Banco B", "Banco A"]
    assert rows[0].tna == Decimal("31.00")
    assert rows[0].details == {}
    assert rows[1].details == {"tna_no_clientes": 25.0}
    assert rows[1].link == "https://a"


def test_uva_mortgages_sort_from_cheapest_and_prefer_the_commercial_name(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    serve(
        monkeypatch,
        [
            {
                "entidad": "banco a",
                "nombreComercial": "Hipoteca A",
                "tna": 0.08,
                "metadata": {"plazo": 20},
            },
            {"entidad": "banco b", "tna": 0.045},
            {"entidad": "banco c", "tna": None},
        ],
    )

    rows = rates.uva_mortgages()

    assert [row.name for row in rows] == ["banco b", "Hipoteca A"]
    assert rows[0].details == {}
    assert rows[1].details == {"plazo": 20}


@pytest.mark.parametrize("failure", [URLError("sin red"), TimeoutError()])
def test_an_unreachable_source_answers_503(
    monkeypatch: pytest.MonkeyPatch, failure: Exception
) -> None:
    def failing_urlopen(request: Request, timeout: int) -> FakeResponse:
        raise failure

    monkeypatch.setattr(rates, "urlopen", failing_urlopen)

    with pytest.raises(HTTPException) as raised:
        rates.wallets()

    assert raised.value.status_code == UNAVAILABLE
