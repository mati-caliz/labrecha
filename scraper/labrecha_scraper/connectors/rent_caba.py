from __future__ import annotations

import csv
import io
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy.orm import Session

from labrecha_db import RentByNeighborhood
from labrecha_scraper.base import Connector, upsert_rows

CSV_URL = (
    "https://cdn.buenosaires.gob.ar/datosabiertos/datasets/instituto-de-vivienda/"
    "mercado-inmobiliario/precio-alquiler-deptos.csv"
)
ROOMS = "2 ambientes"
MIN_EXPECTED_ROWS = 10

MONTHS = {
    "Ene": 1,
    "Feb": 2,
    "Mar": 3,
    "Abr": 4,
    "May": 5,
    "Jun": 6,
    "Jul": 7,
    "Ago": 8,
    "Sep": 9,
    "Oct": 10,
    "Nov": 11,
    "Dic": 12,
}


def _price(raw: str) -> Decimal | None:
    text = raw.strip()
    if not text:
        return None
    try:
        return Decimal(text.replace(",", "."))
    except InvalidOperation:
        return None


class RentCabaConnector(Connector[list[dict[str, Any]]]):
    name = "rent_caba"
    source = "caba"

    def fetch(self) -> list[dict[str, Any]]:
        with self.build_client() as client:
            response = client.get(CSV_URL)
            response.raise_for_status()
        return _monthly_series(response.content.decode("utf-8-sig"))

    def persist(self, session: Session, data: list[dict[str, Any]]) -> int:
        return upsert_rows(session, RentByNeighborhood, data, ["neighborhood", "date"])


def _monthly_series(csv_text: str) -> list[dict[str, Any]]:
    reader = csv.DictReader(io.StringIO(csv_text), delimiter=";")
    by_neighborhood_and_month: dict[tuple[str, date], dict[str, Any]] = {}
    for row in reader:
        if row.get("ambientes") != ROOMS:
            continue
        price = _price(row.get("precio_prom", ""))
        if price is None:
            continue
        month = MONTHS.get((row.get("mes") or "").strip())
        year = (row.get("anio") or "").strip()
        neighborhood = (row.get("barrio") or "").strip()
        if month is None or not year.isdigit() or not neighborhood:
            continue
        point_date = date(int(year), month, 1)
        by_neighborhood_and_month[(neighborhood, point_date)] = {
            "neighborhood": neighborhood,
            "date": point_date,
            "commune": (row.get("comuna") or "").strip() or None,
            "price": price,
            "rooms": ROOMS,
        }
    rows = list(by_neighborhood_and_month.values())
    if len(rows) < MIN_EXPECTED_ROWS:
        raise ValueError(
            "el CSV de alquileres CABA no trajo suficientes barrios (¿cambió el formato?)"
        )
    return rows
