from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from labrecha_api.db import get_session
from labrecha_api.main import app
from labrecha_db import ErrorEvent, ScrapeRun

OK = 200
CREATED = 201
SERVER_ERROR = 500
UNPROCESSABLE = 422


def test_health_is_public_and_cheap(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == OK
    assert response.json() == {"status": "ok"}


def test_scrape_runs_returns_only_the_latest_run_per_job(
    client: TestClient, db_session: Session
) -> None:
    now = datetime.now(UTC)
    db_session.add_all(
        [
            ScrapeRun(
                job_name="dollar",
                status="error",
                started_at=now - timedelta(hours=2),
                rows_upserted=0,
            ),
            ScrapeRun(
                job_name="dollar",
                status="success",
                started_at=now - timedelta(minutes=5),
                rows_upserted=12,
            ),
            ScrapeRun(
                job_name="inflation",
                status="empty",
                started_at=now - timedelta(hours=1),
                rows_upserted=0,
            ),
        ]
    )
    db_session.commit()

    by_job = {run["job_name"]: run for run in client.get("/scrape-runs").json()}
    assert set(by_job) == {"dollar", "inflation"}
    assert by_job["dollar"]["status"] == "success"
    assert by_job["dollar"]["rows_upserted"] == 12
    assert by_job["inflation"]["status"] == "empty"


def test_reported_errors_are_grouped_by_fingerprint(
    client: TestClient, db_session: Session
) -> None:
    payload = {
        "origin": "web-browser",
        "kind": "TypeError",
        "message": "no se pudo leer 'value' de undefined en la fila 42",
        "stack": "at renderRow (chart.tsx:120)",
        "path": "/indicador/dollar_blue",
    }
    first = client.post("/errors", json=payload)
    assert first.status_code == CREATED

    repeated = dict(payload)
    repeated["message"] = "no se pudo leer 'other' de undefined en la fila 77"
    second = client.post("/errors", json=repeated)
    assert second.status_code == CREATED
    assert second.json()["fingerprint"] == first.json()["fingerprint"]
    assert second.json()["occurrences"] == 2

    stored = db_session.scalars(select(ErrorEvent)).all()
    assert len(stored) == 1


def test_different_errors_get_separate_fingerprints(client: TestClient) -> None:
    base = {"origin": "api", "kind": "ValueError", "message": "algo", "stack": "at a.py:1"}
    first = client.post("/errors", json=base).json()
    other = client.post("/errors", json={**base, "kind": "KeyError"}).json()
    assert first["fingerprint"] != other["fingerprint"]

    listed = client.get("/errors").json()
    assert len(listed) == 2


def test_errors_endpoint_rejects_unknown_origin(client: TestClient) -> None:
    response = client.post(
        "/errors", json={"origin": "marte", "kind": "ValueError", "message": "x"}
    )
    assert response.status_code == UNPROCESSABLE


def test_unhandled_exception_is_recorded_and_hidden_from_the_client(
    client: TestClient, db_session: Session
) -> None:
    def failing_session() -> Session:
        raise RuntimeError("la base se cayó en el medio de la consulta")

    app.dependency_overrides[get_session] = failing_session
    try:
        response = client.get("/scrape-runs")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == SERVER_ERROR
    assert response.json() == {"detail": "error interno"}

    recorded = db_session.scalars(select(ErrorEvent)).all()
    assert len(recorded) == 1
    assert recorded[0].origin == "api"
    assert recorded[0].kind == "RuntimeError"
    assert recorded[0].path == "/scrape-runs"
