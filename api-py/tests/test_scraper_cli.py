from __future__ import annotations

import time
from types import SimpleNamespace

import pytest

from labrecha_scraper import cli


class SessionContext:
    def __enter__(self) -> object:
        return object()

    def __exit__(self, exception_type: object, exception: object, traceback: object) -> None:
        return None


def test_run_all_retries_only_failed_jobs(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    attempts = {"stable": 0, "transient": 0}

    def fake_run_job(_session: object, connector: SimpleNamespace) -> SimpleNamespace:
        attempts[connector.name] += 1
        failed = connector.name == "transient" and attempts[connector.name] == 1
        return SimpleNamespace(
            status="error" if failed else "success",
            rows_upserted=0 if failed else 1,
            error="fuente temporalmente inválida" if failed else None,
        )

    monkeypatch.setattr(cli, "ACTIVE_CONNECTORS", {"stable": object(), "transient": object()})
    monkeypatch.setattr(cli, "SessionLocal", SessionContext)
    monkeypatch.setattr(cli, "get_connector", lambda name: SimpleNamespace(name=name))
    monkeypatch.setattr(cli, "run_job", fake_run_job)
    monkeypatch.setattr(time, "sleep", lambda _seconds: None)

    assert cli._run("all") == 0
    assert attempts == {"stable": 1, "transient": 2}
    assert "Reintentando 1 job(s) fallido(s)" in capsys.readouterr().out


def test_run_all_reports_final_failures(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    attempts = 0

    def fake_run_job(_session: object, _connector: SimpleNamespace) -> SimpleNamespace:
        nonlocal attempts
        attempts += 1
        return SimpleNamespace(status="error", rows_upserted=0, error="respuesta inválida")

    monkeypatch.setattr(cli, "ACTIVE_CONNECTORS", {"broken": object()})
    monkeypatch.setattr(cli, "SessionLocal", SessionContext)
    monkeypatch.setattr(cli, "get_connector", lambda name: SimpleNamespace(name=name))
    monkeypatch.setattr(cli, "run_job", fake_run_job)
    monkeypatch.setattr(time, "sleep", lambda _seconds: None)

    assert cli._run("all") == 1
    assert attempts == 2
    assert capsys.readouterr().out.rstrip().endswith("Fallos definitivos: broken")
