from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from labrecha_api.config import get_settings

CREATED = 201
OK = 200
UNAUTHORIZED = 401

VALID_ADMIN_KEY = "clave-de-test"
REPORTED_STACK = "at renderRow (chart.tsx:120)\nat Chart (chart.tsx:40)"


@pytest.fixture
def admin_token(monkeypatch: pytest.MonkeyPatch) -> str:
    settings = get_settings()
    monkeypatch.setattr(settings, "admin_token", VALID_ADMIN_KEY)
    return VALID_ADMIN_KEY


@pytest.fixture
def reported_error(client: TestClient) -> None:
    response = client.post(
        "/errors",
        json={
            "origin": "web-browser",
            "kind": "TypeError",
            "message": "no se pudo leer 'value' de undefined",
            "stack": REPORTED_STACK,
            "path": "/indicador/dollar_blue",
        },
    )
    assert response.status_code == CREATED
    assert response.json()["stack"] is None


@pytest.mark.usefixtures("reported_error")
def test_public_listing_hides_the_stack(client: TestClient) -> None:
    events = client.get("/errors").json()

    assert len(events) == 1
    assert events[0]["stack"] is None
    assert events[0]["kind"] == "TypeError"
    assert events[0]["path"] == "/indicador/dollar_blue"
    assert events[0]["occurrences"] == 1


@pytest.mark.usefixtures("reported_error")
def test_admin_token_unlocks_the_stack(client: TestClient, admin_token: str) -> None:
    events = client.get("/errors", headers={"X-Admin-Token": admin_token}).json()

    assert events[0]["stack"] == REPORTED_STACK


@pytest.mark.usefixtures("reported_error")
def test_a_wrong_token_does_not_unlock_the_stack(client: TestClient) -> None:
    events = client.get("/errors", headers={"X-Admin-Token": "no-es"}).json()

    assert events[0]["stack"] is None


@pytest.mark.usefixtures("reported_error", "admin_token")
def test_an_empty_token_never_matches_an_unset_admin_token(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(get_settings(), "admin_token", "")

    events = client.get("/errors", headers={"X-Admin-Token": ""}).json()
    assert events[0]["stack"] is None


def test_admin_only_post_listing_requires_the_token(client: TestClient) -> None:
    assert client.get("/posts/all").status_code == UNAUTHORIZED


@pytest.mark.usefixtures("db_session")
def test_admin_only_post_listing_accepts_the_token(
    client: TestClient, admin_token: str, db_session: Session
) -> None:
    response = client.get("/posts/all", headers={"X-Admin-Token": admin_token})

    assert response.status_code == OK
    assert response.json() == []
    assert db_session.is_active
