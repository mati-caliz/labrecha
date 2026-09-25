from __future__ import annotations

from datetime import date
from decimal import Decimal

from labrecha_scraper.base import IndicatorConnector, IndicatorPoint
from labrecha_scraper.clock import today_in_argentina
from labrecha_scraper.units import Unit

BASE_URL = "https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/40"
PAGE_LIMIT = 1000
BACKFILL_FROM = "2020-06-30"


class IclBcraConnector(IndicatorConnector):
    name = "icl_bcra"
    source = "bcra"

    def fetch(self) -> list[IndicatorPoint]:
        points: list[IndicatorPoint] = []
        offset = 0
        with self.build_client() as client:
            while True:
                response = client.get(
                    BASE_URL,
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
                            indicator_code="icl",
                            source=self.source,
                            date=date.fromisoformat(raw_date),
                            value=Decimal(str(raw_value)),
                            meta={"unit": Unit.INDEX, "base": "30.6.2020=1", "id_variable": 40},
                        )
                    )
                count = payload.get("metadata", {}).get("resultset", {}).get("count", 0)
                offset += PAGE_LIMIT
                if offset >= count or not detail:
                    break
        return points
