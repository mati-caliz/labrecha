from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from labrecha_db import ErrorEvent
from labrecha_scraper.prune_errors import prune_error_events

RETENTION_DAYS = 90
MAX_ROWS = 5


def _event(session: Session, fingerprint: str, age_days: int) -> None:
    seen = datetime.now(UTC) - timedelta(days=age_days)
    session.add(
        ErrorEvent(
            fingerprint=fingerprint,
            origin="api",
            kind="ValueError",
            message=f"error {fingerprint}",
            occurrences=1,
            first_seen_at=seen,
            last_seen_at=seen,
        )
    )


def _fingerprints(session: Session) -> set[str]:
    return set(session.scalars(select(ErrorEvent.fingerprint)))


def test_expired_events_are_deleted(db_session: Session) -> None:
    _event(db_session, "viejo", age_days=RETENTION_DAYS + 1)
    _event(db_session, "reciente", age_days=1)
    db_session.commit()

    result = prune_error_events(db_session, retention_days=RETENTION_DAYS, max_rows=MAX_ROWS)

    assert result.expired == 1
    assert _fingerprints(db_session) == {"reciente"}


def test_the_newest_events_survive_the_row_cap(db_session: Session) -> None:
    for age in range(MAX_ROWS + 3):
        _event(db_session, f"evento-{age}", age_days=age)
    db_session.commit()

    result = prune_error_events(db_session, retention_days=RETENTION_DAYS, max_rows=MAX_ROWS)

    assert result.overflowing == 3
    assert _fingerprints(db_session) == {f"evento-{age}" for age in range(MAX_ROWS)}


def test_pruning_is_idempotent(db_session: Session) -> None:
    _event(db_session, "viejo", age_days=RETENTION_DAYS + 1)
    _event(db_session, "reciente", age_days=1)
    db_session.commit()

    prune_error_events(db_session, retention_days=RETENTION_DAYS, max_rows=MAX_ROWS)
    second = prune_error_events(db_session, retention_days=RETENTION_DAYS, max_rows=MAX_ROWS)

    assert second.total == 0
    assert _fingerprints(db_session) == {"reciente"}


def test_nothing_is_deleted_when_everything_is_fresh_and_small(db_session: Session) -> None:
    _event(db_session, "uno", age_days=1)
    _event(db_session, "dos", age_days=2)
    db_session.commit()

    result = prune_error_events(db_session, retention_days=RETENTION_DAYS, max_rows=MAX_ROWS)

    assert result.total == 0
    assert len(_fingerprints(db_session)) == 2


@pytest.mark.usefixtures("db_session")
def test_pruning_an_empty_table_is_safe(db_session: Session) -> None:
    result = prune_error_events(db_session, retention_days=RETENTION_DAYS, max_rows=MAX_ROWS)

    assert result.total == 0
