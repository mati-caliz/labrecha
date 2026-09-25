from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from labrecha_db import ErrorEvent
from labrecha_scraper.base import affected_rows


@dataclass(frozen=True)
class PruneResult:
    expired: int
    overflowing: int

    @property
    def total(self) -> int:
        return self.expired + self.overflowing


def _delete_expired(session: Session, retention_days: int) -> int:
    cutoff = datetime.now(UTC) - timedelta(days=retention_days)
    statement = delete(ErrorEvent).where(ErrorEvent.last_seen_at < cutoff)
    return affected_rows(session.execute(statement))


def _delete_overflowing(session: Session, max_rows: int) -> int:
    survivors = (
        select(ErrorEvent.fingerprint)
        .order_by(ErrorEvent.last_seen_at.desc())
        .limit(max_rows)
        .scalar_subquery()
    )
    statement = delete(ErrorEvent).where(ErrorEvent.fingerprint.not_in(survivors))
    return affected_rows(session.execute(statement))


def prune_error_events(session: Session, *, retention_days: int, max_rows: int) -> PruneResult:
    expired = _delete_expired(session, retention_days)
    overflowing = _delete_overflowing(session, max_rows)
    session.commit()
    return PruneResult(expired=expired, overflowing=overflowing)
