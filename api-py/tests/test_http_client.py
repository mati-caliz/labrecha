from __future__ import annotations

import pytest

from labrecha_scraper.http_client import InvalidResponseError, retry_invalid_response


def test_invalid_content_is_retried(monkeypatch: pytest.MonkeyPatch) -> None:
    attempts = 0
    delays: list[float] = []

    def operation() -> str:
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            raise InvalidResponseError("respuesta temporal")
        return "ok"

    monkeypatch.setattr("labrecha_scraper.http_client.time.sleep", delays.append)

    result = retry_invalid_response(operation, source="senado", max_attempts=3)

    assert result == "ok"
    assert attempts == 3
    assert delays == [1.0, 2.0]


def test_invalid_content_fails_after_the_last_attempt(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    attempts = 0

    def operation() -> str:
        nonlocal attempts
        attempts += 1
        raise InvalidResponseError("respuesta persistente")

    monkeypatch.setattr("labrecha_scraper.http_client.time.sleep", lambda _: None)

    with pytest.raises(InvalidResponseError, match="respuesta persistente"):
        retry_invalid_response(operation, source="senado", max_attempts=3)

    assert attempts == 3
