from __future__ import annotations

import re
from hashlib import sha256

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from labrecha_db import ErrorEvent

DIGITS = re.compile(r"\d+")
WHITESPACE = re.compile(r"\s+")
QUOTED = re.compile(r"(['\"])(?:(?!\1).)*\1")

NUMBER_PLACEHOLDER = "<n>"
QUOTED_PLACEHOLDER = "<v>"
NORMALIZED_MAX_LENGTH = 200
FINGERPRINT_SEPARATOR = "|"


def normalize_for_grouping(text: str) -> str:
    collapsed = WHITESPACE.sub(" ", text).strip()
    without_values = QUOTED.sub(QUOTED_PLACEHOLDER, collapsed)
    without_numbers = DIGITS.sub(NUMBER_PLACEHOLDER, without_values)
    return without_numbers[:NORMALIZED_MAX_LENGTH]


def first_stack_frame(stack: str | None) -> str:
    if stack is None:
        return ""
    for line in stack.splitlines():
        stripped = line.strip()
        if stripped:
            return normalize_for_grouping(stripped)
    return ""


def fingerprint_for(origin: str, kind: str, message: str, stack: str | None) -> str:
    parts = [origin, kind, normalize_for_grouping(message), first_stack_frame(stack)]
    return sha256(FINGERPRINT_SEPARATOR.join(parts).encode()).hexdigest()


def record_error(
    session: Session,
    *,
    origin: str,
    kind: str,
    message: str,
    stack: str | None = None,
    path: str | None = None,
) -> str:
    fingerprint = fingerprint_for(origin, kind, message, stack)
    statement = insert(ErrorEvent).values(
        fingerprint=fingerprint,
        origin=origin,
        kind=kind,
        message=message,
        stack=stack,
        path=path,
        occurrences=1,
    )
    statement = statement.on_conflict_do_update(
        index_elements=["fingerprint"],
        set_={
            "occurrences": ErrorEvent.occurrences + 1,
            "last_seen_at": func.now(),
            "message": statement.excluded.message,
            "stack": statement.excluded.stack,
            "path": statement.excluded.path,
        },
    )
    session.execute(statement)
    session.commit()
    return fingerprint
