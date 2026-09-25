from __future__ import annotations

from datetime import date
from decimal import Decimal

import httpx

from labrecha_scraper.base import IndicatorConnector, IndicatorPoint
from labrecha_scraper.clock import today_in_argentina
from labrecha_scraper.units import Unit

BASE_URL = "https://api.bcra.gob.ar/estadisticas/v4.0/monetarias"
PAGE_LIMIT = 1000
BACKFILL_FROM = "2004-01-01"

VARIABLES = {
    12: "rate_time_deposit",
    44: "rate_tamar",
}


class BcraRatesConnector(IndicatorConnector):
    name = "bcra_rates"
    source = "bcra"

    def fetch(self) -> list[IndicatorPoint]:
        points: list[IndicatorPoint] = []
        with self.build_client() as client:
            for id_variable, indicator_code in VARIABLES.items():
                points.extend(self._fetch_variable(client, id_variable, indicator_code))
        return points

    def _fetch_variable(
        self, client: httpx.Client, id_variable: int, indicator_code: str
    ) -> list[IndicatorPoint]:
        result: list[IndicatorPoint] = []
        offset = 0
        while True:
            response = client.get(
                f"{BASE_URL}/{id_variable}",
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
                result.append(
                    IndicatorPoint(
                        indicator_code=indicator_code,
                        source=self.source,
                        date=date.fromisoformat(raw_date),
                        value=Decimal(str(raw_value)),
                        meta={"unit": Unit.ANNUAL_NOMINAL_RATE, "id_variable": id_variable},
                    )
                )
            count = payload.get("metadata", {}).get("resultset", {}).get("count", 0)
            offset += PAGE_LIMIT
            if offset >= count or not detail:
                break
        return result
