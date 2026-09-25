from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from labrecha_db import IndicatorHistory
from labrecha_scraper.base import Connector, IndicatorPoint, upsert_rows
from labrecha_scraper.connectors.dollar import dollar_code
from labrecha_scraper.units import Unit

HISTORICAL_DOLLARS_URL = "https://api.argentinadatos.com/v1/cotizaciones/dolares"


class DollarHistoricalConnector(Connector[list[IndicatorPoint]]):
    name = "dollar_historical"
    source = "argentinadatos"

    def fetch(self) -> list[IndicatorPoint]:
        with self.build_client() as client:
            response = client.get(HISTORICAL_DOLLARS_URL)
            response.raise_for_status()
            payload = response.json()

        points_by_key: dict[tuple[str, date], IndicatorPoint] = {}
        for item in payload:
            dollar_type = item.get("casa")
            sell_price = item.get("venta")
            raw_date = item.get("fecha")
            if dollar_type is None or sell_price is None or raw_date is None:
                continue
            indicator_code = dollar_code(dollar_type)
            point_date = date.fromisoformat(raw_date)
            points_by_key[(indicator_code, point_date)] = IndicatorPoint(
                indicator_code=indicator_code,
                source=self.source,
                date=point_date,
                value=Decimal(str(sell_price)),
                meta={"unit": Unit.ARS, "compra": item.get("compra"), "venta": sell_price},
            )
        return list(points_by_key.values())

    def persist(self, session: Session, data: list[IndicatorPoint]) -> int:
        points: list[IndicatorPoint] = data
        rows = [
            {
                "indicator_code": point.indicator_code,
                "source": point.source,
                "date": point.date,
                "value": point.value,
                "meta": point.meta,
            }
            for point in points
        ]
        return upsert_rows(
            session,
            IndicatorHistory,
            rows,
            index_elements=["indicator_code", "source", "date"],
        )
