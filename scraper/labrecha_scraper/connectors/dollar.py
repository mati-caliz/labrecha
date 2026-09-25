from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from labrecha_scraper.base import IndicatorConnector, IndicatorPoint
from labrecha_scraper.units import Unit

DOLLAR_URL = "https://dolarapi.com/v1/dolares"

DOLLAR_TYPE_TO_CODE = {
    "oficial": "official",
    "bolsa": "mep",
    "contadoconliqui": "ccl",
    "cripto": "crypto",
    "mayorista": "wholesale",
    "tarjeta": "card",
}


def dollar_code(dollar_type: str) -> str:
    return f"dollar_{DOLLAR_TYPE_TO_CODE.get(dollar_type, dollar_type)}"


def _parse_date(raw: str | None) -> date:
    if raw is None:
        raise ValueError("fechaActualizacion ausente")
    return datetime.fromisoformat(raw).date()


class DollarConnector(IndicatorConnector):
    name = "dollar"
    source = "dolarapi"

    def fetch(self) -> list[IndicatorPoint]:
        with self.build_client() as client:
            response = client.get(DOLLAR_URL)
            response.raise_for_status()
            payload = response.json()

        points: list[IndicatorPoint] = []
        for item in payload:
            dollar_type = item.get("casa")
            sell_price = item.get("venta")
            if dollar_type is None or sell_price is None:
                continue
            points.append(
                IndicatorPoint(
                    indicator_code=dollar_code(dollar_type),
                    source=self.source,
                    date=_parse_date(item.get("fechaActualizacion")),
                    value=Decimal(str(sell_price)),
                    meta={
                        "unit": Unit.ARS,
                        "nombre": item.get("nombre"),
                        "compra": item.get("compra"),
                        "venta": sell_price,
                    },
                )
            )
        return points
