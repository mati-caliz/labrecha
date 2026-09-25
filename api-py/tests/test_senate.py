from __future__ import annotations

import httpx
import pytest

from labrecha_scraper.connectors.senate import SenateConnector


def test_an_invalid_senators_response_is_downloaded_again(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payloads = iter(
        [
            "mantenimiento",
            '{"table":{"rows":[{"ID":"42","APELLIDO":"Perez","NOMBRE":"Ana"}]}}',
        ]
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=next(payloads), request=request)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    connector = SenateConnector()
    monkeypatch.setattr("labrecha_scraper.http_client.time.sleep", lambda _: None)
    monkeypatch.setattr(connector, "build_client", lambda: client)

    rows = connector.fetch()

    assert rows[0]["senator_id"] == "42"
