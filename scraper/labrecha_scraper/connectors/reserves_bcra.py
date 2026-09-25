from __future__ import annotations

from datetime import date
from decimal import Decimal

from labrecha_scraper.base import IndicatorConnector, IndicatorPoint
from labrecha_scraper.clock import today_in_argentina
from labrecha_scraper.units import Unit

RESERVES_URL = "https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/1"
PAGE_LIMIT = 1000
BACKFILL_FROM = "1996-01-01"


class ReservesBcraConnector(IndicatorConnector):
    name = "reserves_bcra"
    source = "bcra"

    def fetch(self) -> list[IndicatorPoint]:
        points: list[IndicatorPoint] = []
        offset = 0
        with self.build_client() as client:
            while True:
                response = client.get(
                    RESERVES_URL,
                    params={
                        "desde": BACKFILL_FROM,
                        "hasta": today_in_argentina().isoformat(),
                        "limit": PAGE_LIMIT,
                        "offset": offset,
                    },
                )
                response.raise_for_status()
                payload = response.json()
                results = payload.get("results", [])
                detail = results[0].get("detalle", []) if results else []
                for item in detail:
                    raw_date = item.get("fecha")
                    raw_value = item.get("valor")
                    if raw_date is None or raw_value is None:
                        continue
                    points.append(
                        IndicatorPoint(
                            indicator_code="international_reserves",
                            source=self.source,
                            date=date.fromisoformat(raw_date),
                            value=Decimal(str(raw_value)),
                            meta={"unit": Unit.USD_MILLIONS, "id_variable": 1},
                        )
                    )
                count = payload.get("metadata", {}).get("resultset", {}).get("count", 0)
                offset += PAGE_LIMIT
                if offset >= count or not detail:
                    break
        return points
