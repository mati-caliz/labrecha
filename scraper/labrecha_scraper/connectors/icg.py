from __future__ import annotations

import re
from datetime import date
from decimal import Decimal

from labrecha_scraper.base import IndicatorConnector, IndicatorPoint
from labrecha_scraper.clock import today_in_argentina

ICG_URL = "https://www.utdt.edu/ver_contenido.php?id_contenido=1439&id_item_menu=2964"
INDICATOR_CODE = "government_confidence"
MIN_EXPECTED_POINTS = 6

MONTHS = {
    name: number
    for number, name in enumerate(
        [
            "enero",
            "febrero",
            "marzo",
            "abril",
            "mayo",
            "junio",
            "julio",
            "agosto",
            "septiembre",
            "octubre",
            "noviembre",
            "diciembre",
        ],
        start=1,
    )
}

ICG_PATTERN = re.compile(
    r"icg(?:\s+de\s+([a-záéíóú]+))?\s+fue\s+de\s+(\d+,\d+)\s*puntos",
    re.IGNORECASE,
)


class IcgConnector(IndicatorConnector):
    name = "icg"
    source = "utdt"

    def fetch(self) -> list[IndicatorPoint]:
        with self.build_client() as client:
            response = client.get(ICG_URL)
            response.raise_for_status()
        return _parse(_plain_text(response.text))


def _plain_text(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text.replace("\xa0", " "))


def _add_months(year: int, month: int, delta: int) -> tuple[int, int]:
    index = year * 12 + (month - 1) + delta
    return index // 12, index % 12 + 1


def _parse(text: str) -> list[IndicatorPoint]:
    matches = [
        (match.group(1).lower() if match.group(1) else None, match.group(2))
        for match in ICG_PATTERN.finditer(text)
    ]
    named = [month for month, _ in matches if month in MONTHS]
    if len(matches) < MIN_EXPECTED_POINTS or not named:
        raise ValueError(
            f"formato inesperado en la página del ICG: {len(matches)} valores, "
            f"{len(named)} con mes nombrado (¿cambió el HTML de UTDT?)"
        )

    anchor_index, anchor_month = next(
        (index, MONTHS[month])
        for index, (month, _) in enumerate(matches)
        if month is not None and month in MONTHS
    )
    today = today_in_argentina()
    anchor_year = today.year if anchor_month <= today.month else today.year - 1
    year, month = _add_months(anchor_year, anchor_month, -anchor_index)

    points: list[IndicatorPoint] = []
    for name, value in matches:
        if name in MONTHS and MONTHS[name] != month:
            raise ValueError(
                f"desalineación de meses en el ICG (esperado mes {month}, texto '{name}'): "
                "el parser quedó desfasado, se aborta para no cargar datos dudosos"
            )
        points.append(
            IndicatorPoint(
                indicator_code=INDICATOR_CODE,
                source="utdt",
                date=date(year, month, 1),
                value=Decimal(value.replace(",", ".")),
            )
        )
        year, month = _add_months(year, month, -1)
    return points
