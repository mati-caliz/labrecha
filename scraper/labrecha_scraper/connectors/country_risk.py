from __future__ import annotations

from datetime import date
from decimal import Decimal

from labrecha_scraper.base import IndicatorConnector, IndicatorPoint
from labrecha_scraper.units import Unit

COUNTRY_RISK_URL = "https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais"


class CountryRiskConnector(IndicatorConnector):
    name = "country_risk"
    source = "argentinadatos"

    def fetch(self) -> list[IndicatorPoint]:
        with self.build_client() as client:
            response = client.get(COUNTRY_RISK_URL)
            response.raise_for_status()
            payload = response.json()

        points: list[IndicatorPoint] = []
        for item in payload:
            raw_date = item.get("fecha")
            raw_value = item.get("valor")
            if raw_date is None or raw_value is None:
                continue
            points.append(
                IndicatorPoint(
                    indicator_code="country_risk",
                    source=self.source,
                    date=date.fromisoformat(raw_date),
                    value=Decimal(str(raw_value)),
                    meta={"unit": Unit.POINTS},
                )
            )
        return points
