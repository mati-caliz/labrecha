from __future__ import annotations

from datetime import UTC, date
from datetime import datetime as datetime_type
from typing import Any

import httpx
from sqlalchemy.orm import Session

from labrecha_db import Holiday
from labrecha_scraper.base import Connector, upsert_rows

HOLIDAYS_URL = "https://date.nager.at/api/v3/PublicHolidays/{year}/AR"
BACKFILL_START_YEAR = 2010


class HolidaysConnector(Connector[list[dict[str, Any]]]):
    name = "holidays"
    source = "nager"

    def fetch(self) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        with self.build_client() as client:
            for year in self._years():
                rows.extend(self._fetch_year(client, year))
        return rows

    def persist(self, session: Session, data: list[dict[str, Any]]) -> int:
        return upsert_rows(session, Holiday, data, ["date", "name"])

    def _years(self) -> range:
        current_year = datetime_type.now(UTC).year
        return range(BACKFILL_START_YEAR, current_year + 2)

    def _fetch_year(self, client: httpx.Client, year: int) -> list[dict[str, Any]]:
        response = client.get(HOLIDAYS_URL.format(year=year))
        response.raise_for_status()
        rows: list[dict[str, Any]] = []
        for record in response.json():
            raw_date = record.get("date")
            name = record.get("name")
            if raw_date is None or name is None:
                continue
            types = record.get("types") or []
            rows.append(
                {
                    "date": date.fromisoformat(raw_date),
                    "name": name,
                    "local_name": record.get("localName"),
                    "is_global": record.get("global"),
                    "is_fixed": record.get("fixed"),
                    "types": ",".join(types) or None,
                }
            )
        return rows
