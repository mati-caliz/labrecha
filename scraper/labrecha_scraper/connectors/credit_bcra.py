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


class VariableSpec:
    def __init__(self, id_variable: int, code: str, unit: Unit) -> None:
        self.id_variable = id_variable
        self.code = code
        self.unit = unit


VARIABLES: list[VariableSpec] = [
    VariableSpec(144, "rate_personal_loans", Unit.ANNUAL_NOMINAL_RATE),
    VariableSpec(13, "rate_overdraft", Unit.ANNUAL_NOMINAL_RATE),
    VariableSpec(117, "private_sector_loans", Unit.ARS_MILLIONS),
]


class CreditBcraConnector(IndicatorConnector):
    name = "credit_bcra"
    source = "bcra"

    def fetch(self) -> list[IndicatorPoint]:
        points: list[IndicatorPoint] = []
        with self.build_client() as client:
            for spec in VARIABLES:
                points.extend(self._fetch_variable(client, spec))
        return points

    def _fetch_variable(self, client: httpx.Client, spec: VariableSpec) -> list[IndicatorPoint]:
        result: list[IndicatorPoint] = []
        offset = 0
        while True:
            response = client.get(
                f"{BASE_URL}/{spec.id_variable}",
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
                        indicator_code=spec.code,
                        source=self.source,
                        date=date.fromisoformat(raw_date),
                        value=Decimal(str(raw_value)),
                        meta={"unit": spec.unit, "id_variable": spec.id_variable},
                    )
                )
            count = payload.get("metadata", {}).get("resultset", {}).get("count", 0)
            offset += PAGE_LIMIT
            if offset >= count or not detail:
                break
        return result
