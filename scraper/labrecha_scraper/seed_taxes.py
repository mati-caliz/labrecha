from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from labrecha_db import IndicatorHistory
from labrecha_scraper.units import Unit

SOURCE = "iaraf"
SOURCE_REF = "IARAF — Vademécum Tributario"

TAX_SNAPSHOTS: list[dict[str, Any]] = [
    {
        "date": date(2023, 7, 1),
        "total": 148,
        "nacionales": 45,
        "provinciales": 25,
        "municipales": 78,
        "reference": f"{SOURCE_REF} 2023",
    },
    {
        "date": date(2024, 7, 7),
        "total": 155,
        "nacionales": 46,
        "provinciales": 25,
        "municipales": 84,
        "reference": f"{SOURCE_REF} 2024",
    },
]

LEVEL_CODES = {
    "total": "taxes_total",
    "nacionales": "taxes_national",
    "provinciales": "taxes_provincial",
    "municipales": "taxes_municipal",
}


def seed_taxes(session: Session) -> int:
    rows: list[dict[str, Any]] = []
    for snapshot in TAX_SNAPSHOTS:
        for level, code in LEVEL_CODES.items():
            rows.append(
                {
                    "indicator_code": code,
                    "source": SOURCE,
                    "date": snapshot["date"],
                    "value": Decimal(snapshot[level]),
                    "meta": {"unit": Unit.TAXES, "reference": snapshot["reference"]},
                }
            )
    statement = insert(IndicatorHistory).values(rows)
    statement = statement.on_conflict_do_update(
        constraint="uq_indicator_source_date",
        set_={"value": statement.excluded.value, "meta": statement.excluded.meta},
    )
    session.execute(statement)
    session.commit()
    return len(rows)
