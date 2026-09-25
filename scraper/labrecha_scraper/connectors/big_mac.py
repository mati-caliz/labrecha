from __future__ import annotations

import csv
import io
from datetime import date
from decimal import Decimal

from labrecha_scraper.base import IndicatorConnector, IndicatorPoint
from labrecha_scraper.units import Unit

CSV_URL = (
    "https://raw.githubusercontent.com/TheEconomist/big-mac-data/master/"
    "output-data/big-mac-full-index.csv"
)
ISO_ARGENTINA = "ARG"
MIN_EXPECTED_POINTS = 3


class BigMacConnector(IndicatorConnector):
    name = "big_mac"
    source = "the_economist"

    def fetch(self) -> list[IndicatorPoint]:
        with self.build_client() as client:
            response = client.get(CSV_URL)
            response.raise_for_status()
        return _parse(response.text)


def _parse(csv_text: str) -> list[IndicatorPoint]:
    points: list[IndicatorPoint] = []
    reader = csv.DictReader(io.StringIO(csv_text))
    for row in reader:
        if row.get("iso_a3") != ISO_ARGENTINA:
            continue
        fecha = date.fromisoformat(row["date"])
        points.append(_point("big_mac_ars", fecha, Decimal(row["local_price"]), Unit.ARS))
        points.append(_point("big_mac_usd", fecha, Decimal(row["dollar_price"]), Unit.USD))
        points.append(
            _point(
                "big_mac_valuation",
                fecha,
                Decimal(row["USD_raw"]) * 100,
                Unit.PERCENT,
            )
        )
    if len(points) < MIN_EXPECTED_POINTS:
        raise ValueError(
            "el CSV del Big Mac no trajo filas de Argentina (¿cambió el formato o el iso_a3?)"
        )
    return points


def _point(indicator_code: str, fecha: date, value: Decimal, unit: Unit) -> IndicatorPoint:
    return IndicatorPoint(
        indicator_code=indicator_code,
        source="the_economist",
        date=fecha,
        value=value,
        meta={"unit": unit},
    )
