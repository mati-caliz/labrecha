from __future__ import annotations

from calendar import monthrange
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

import httpx

from labrecha_scraper.base import IndicatorConnector, IndicatorPoint
from labrecha_scraper.units import Unit

SERIES_URL = "https://apis.datos.gob.ar/series/api/series/"
SERIES_LIMIT = 5000
SERIES_ROW_FIELDS = 2

MONTHLY_CODE = "cpi_monthly"
YEAR_OVER_YEAR_CODE = "cpi_yoy"
PERCENT_FACTOR = Decimal(100)
VARIATION_DECIMALS = Decimal("0.01")

MONTHS_IN_YEAR = 12
MONTH_OVER_MONTH_LAG = 1


@dataclass(frozen=True)
class Jurisdiction:
    source: str
    series_id: str
    geography: str
    agency: str


JURISDICTIONS: tuple[Jurisdiction, ...] = (
    Jurisdiction(
        source="iec_caba",
        series_id="193.2_NIVEL_GENERAL_2021_0_13_2",
        geography="Ciudad Autónoma de Buenos Aires",
        agency="Instituto de Estadística y Censos de la Ciudad de Buenos Aires",
    ),
    Jurisdiction(
        source="deie_mendoza",
        series_id="195.1_NIVEL_GENERAL_0_0_13",
        geography="Mendoza",
        agency="Dirección de Estadísticas e Investigaciones Económicas de Mendoza",
    ),
    Jurisdiction(
        source="dpec_neuquen",
        series_id="196.1_NIVEL_GENERAL_2014_0_13",
        geography="Neuquén",
        agency="Dirección Provincial de Estadística y Censos de Neuquén",
    ),
    Jurisdiction(
        source="dpec_san_luis",
        series_id="197.1_NIVEL_GENERAL_2014_0_13",
        geography="San Luis",
        agency="Dirección Provincial de Estadística y Censos de San Luis",
    ),
    Jurisdiction(
        source="ipec_santa_fe",
        series_id="198.1_NIVEL_GENERAL_2014_0_13",
        geography="Santa Fe",
        agency="Instituto Provincial de Estadística y Censos de Santa Fe",
    ),
    Jurisdiction(
        source="de_tucuman",
        series_id="199.1_NIVEL_GENERAL_2014_0_13",
        geography="Tucumán",
        agency="Dirección de Estadística de Tucumán",
    ),
    Jurisdiction(
        source="ipecd_chaco",
        series_id="464.2_IPC_CHACO_NG_0_0_12_52",
        geography="Chaco",
        agency="Instituto Provincial de Estadísticas y Ciencia de Datos de Chaco",
    ),
    Jurisdiction(
        source="dgeyc_cordoba",
        series_id="194.1_NIVEL_GENERAL_2014_0_13",
        geography="Córdoba",
        agency="Dirección General de Estadística y Censos de Córdoba",
    ),
)

MIN_JURISDICTIONS_WITH_DATA = 4


def end_of_month(day: date) -> date:
    return date(day.year, day.month, monthrange(day.year, day.month)[1])


def percent_variation(previous: Decimal, current: Decimal) -> Decimal:
    return ((current / previous - 1) * PERCENT_FACTOR).quantize(VARIATION_DECIMALS)


class CpiJurisdictionsConnector(IndicatorConnector):
    name = "cpi_jurisdictions"
    source = "datosgobar"

    def fetch(self) -> list[IndicatorPoint]:
        points: list[IndicatorPoint] = []
        covered = 0
        with self.build_client() as client:
            for jurisdiction in JURISDICTIONS:
                index_series = self._fetch_index(client, jurisdiction)
                if not index_series:
                    continue
                covered += 1
                points.extend(_variation_points(jurisdiction, index_series))

        if covered < MIN_JURISDICTIONS_WITH_DATA:
            raise ValueError(
                f"sólo {covered} de {len(JURISDICTIONS)} jurisdicciones devolvieron índice "
                f"(mínimo {MIN_JURISDICTIONS_WITH_DATA}): ¿cambió el catálogo de datos.gob.ar?"
            )
        return points

    def _fetch_index(
        self, client: httpx.Client, jurisdiction: Jurisdiction
    ) -> list[tuple[date, Decimal]]:
        response = client.get(
            SERIES_URL,
            params={
                "ids": jurisdiction.series_id,
                "limit": SERIES_LIMIT,
                "sort": "asc",
                "format": "json",
            },
        )
        response.raise_for_status()
        series: list[tuple[date, Decimal]] = []
        for row in response.json().get("data", []):
            if len(row) < SERIES_ROW_FIELDS or row[0] is None or row[1] is None:
                continue
            index_value = Decimal(str(row[1]))
            if index_value <= 0:
                continue
            series.append((date.fromisoformat(row[0]), index_value))
        return series


def _variation_points(
    jurisdiction: Jurisdiction, index_series: list[tuple[date, Decimal]]
) -> list[IndicatorPoint]:
    by_month = {(day.year, day.month): (day, value) for day, value in index_series}
    points: list[IndicatorPoint] = []
    for day, value in index_series:
        for indicator_code, lag in (
            (MONTHLY_CODE, MONTH_OVER_MONTH_LAG),
            (YEAR_OVER_YEAR_CODE, MONTHS_IN_YEAR),
        ):
            reference = _shifted_month(by_month, day, -lag)
            if reference is None:
                continue
            points.append(
                IndicatorPoint(
                    indicator_code=indicator_code,
                    source=jurisdiction.source,
                    date=end_of_month(day),
                    value=percent_variation(reference, value),
                    meta={
                        "unit": Unit.PERCENT,
                        "geography": jurisdiction.geography,
                        "agency": jurisdiction.agency,
                        "series_id": jurisdiction.series_id,
                        "derived_from": "índice de nivel general publicado por la jurisdicción",
                    },
                )
            )
    return points


def _shifted_month(
    by_month: dict[tuple[int, int], tuple[date, Decimal]], day: date, delta: int
) -> Decimal | None:
    index = day.year * MONTHS_IN_YEAR + (day.month - 1) + delta
    entry = by_month.get((index // MONTHS_IN_YEAR, index % MONTHS_IN_YEAR + 1))
    return None if entry is None else entry[1]
