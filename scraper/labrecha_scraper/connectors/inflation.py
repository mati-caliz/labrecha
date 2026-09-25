from __future__ import annotations

from datetime import date
from decimal import Decimal

import httpx

from labrecha_scraper.base import IndicatorConnector, IndicatorPoint
from labrecha_scraper.units import Unit

MONTHLY_URL = "https://api.argentinadatos.com/v1/finanzas/indices/inflacion"
YEAR_OVER_YEAR_URL = "https://api.argentinadatos.com/v1/finanzas/indices/inflacionInteranual"

NATIONAL_GEOGRAPHY = "Nacional"
MEASURING_AGENCY = "INDEC"


class InflationConnector(IndicatorConnector):
    name = "inflation"
    source = "argentinadatos"

    def fetch(self) -> list[IndicatorPoint]:
        points: list[IndicatorPoint] = []
        with self.build_client() as client:
            points.extend(self._fetch_series(client, MONTHLY_URL, "cpi_monthly"))
            points.extend(self._fetch_series(client, YEAR_OVER_YEAR_URL, "cpi_yoy"))
        return points

    def _fetch_series(
        self, client: httpx.Client, url: str, indicator_code: str
    ) -> list[IndicatorPoint]:
        response = client.get(url)
        response.raise_for_status()
        result: list[IndicatorPoint] = []
        for item in response.json():
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
                    meta={
                        "unit": Unit.PERCENT,
                        "geography": NATIONAL_GEOGRAPHY,
                        "agency": MEASURING_AGENCY,
                    },
                )
            )
        return result
