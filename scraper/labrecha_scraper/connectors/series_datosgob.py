from __future__ import annotations

from datetime import date
from decimal import Decimal

import httpx

from labrecha_scraper.base import IndicatorConnector, IndicatorPoint
from labrecha_scraper.units import Unit

SERIES_URL = "https://apis.datos.gob.ar/series/api/series/"
SERIES_ROW_FIELDS = 2


class SeriesSpec:
    def __init__(self, code: str, unit: Unit, factor: Decimal = Decimal(1)) -> None:
        self.code = code
        self.unit = unit
        self.factor = factor


SERIES: dict[str, SeriesSpec] = {
    "444.1_CANASTA_BARIA_0_0_26_47": SeriesSpec("basic_basket_national", Unit.ARS),
    "148.3_INIVELNAL_DICI_M_26": SeriesSpec("cpi_level_general", Unit.INDEX),
    "174.1_RRVAS_IDOS_0_0_36": SeriesSpec("international_reserves", Unit.USD_MILLIONS),
    "158.1_REPTE_0_0_5": SeriesSpec("ripte", Unit.ARS),
    "149.1_TL_INDIIOS_OCTU_0_21": SeriesSpec("wage_index", Unit.INDEX),
    "64.2_POBLACION_NUA_0_0_34_74": SeriesSpec("poverty_persons", Unit.PERCENT, Decimal(100)),
    "331.1_SALDO_BASERIA__15": SeriesSpec("monetary_base", Unit.ARS_MILLIONS),
    "172.3_TL_RECAION_M_0_0_17": SeriesSpec("tax_revenue", Unit.ARS_MILLIONS),
    "143.2_NO_PR_2004_A_21": SeriesSpec("emae", Unit.INDEX),
    "42.3_EPH_PUNTUATAL_0_M_30": SeriesSpec("unemployment", Unit.PERCENT, Decimal(100)),
    "431.1_EXPECTATIVANA_M_0_0_29_85": SeriesSpec("inflation_expectations_rem", Unit.PERCENT),
    "57.1_SMVMM_0_M_34": SeriesSpec("minimum_wage", Unit.ARS),
    "58.1_MP_0_M_13": SeriesSpec("pension_minimum", Unit.ARS),
    "165.1_AAUH_0_0_3": SeriesSpec("universal_child_allowance", Unit.ARS),
    "189.1_JUBILACIONINO_0_0_53": SeriesSpec("pension_beneficiaries", Unit.BENEFITS),
    "453.1_SERIE_ORIGNAL_0_0_14_46": SeriesSpec("industrial_production", Unit.INDEX),
    "452.3_RESULTADO_RIO_0_M_18_54": SeriesSpec("primary_balance", Unit.ARS_MILLIONS),
    "378.9_RESULTADO_017_0_M_18_90": SeriesSpec("financial_balance", Unit.ARS_MILLIONS),
    "151.1_AARIADOTAC_2012_M_26": SeriesSpec("private_wage_employment", Unit.THOUSANDS_OF_PEOPLE),
    "151.1_AARIADOTAC_2012_M_25": SeriesSpec("public_wage_employment", Unit.THOUSANDS_OF_PEOPLE),
    "151.1_IPENDIETAC_2012_M_34": SeriesSpec("self_employed_autonomous", Unit.THOUSANDS_OF_PEOPLE),
    "151.1_IPENDIETAC_2012_M_36": SeriesSpec("self_employed_monotax", Unit.THOUSANDS_OF_PEOPLE),
    "151.1_IPENDIETAC_2012_M_43": SeriesSpec(
        "self_employed_social_monotax", Unit.THOUSANDS_OF_PEOPLE
    ),
    "151.1_AARIADOTAC_2012_M_40": SeriesSpec(
        "domestic_workers_employment", Unit.THOUSANDS_OF_PEOPLE
    ),
    "52.2_ASDJ_0_0_37": SeriesSpec("informal_employment", Unit.PERCENT, Decimal(100)),
    "452.2_ENERGIAGIA_0_T_7_56": SeriesSpec("energy_subsidies", Unit.ARS_MILLIONS),
    "452.2_TRANSPORTERTE_0_T_10_32": SeriesSpec("transport_subsidies", Unit.ARS_MILLIONS),
    "373.9_GTOS_CORR_017__14_45": SeriesSpec("current_expenditure", Unit.ARS_MILLIONS),
    "373.9_GTOS_CAP_2017__13_54": SeriesSpec("capital_expenditure", Unit.ARS_MILLIONS),
}


class SeriesDatosGobConnector(IndicatorConnector):
    name = "series_datosgob"
    source = "datosgobar"

    def fetch(self) -> list[IndicatorPoint]:
        points: list[IndicatorPoint] = []
        with self.build_client() as client:
            for series_id, spec in SERIES.items():
                points.extend(self._fetch_series(client, series_id, spec))
        return points

    def _fetch_series(
        self, client: httpx.Client, series_id: str, spec: SeriesSpec
    ) -> list[IndicatorPoint]:
        response = client.get(
            SERIES_URL,
            params={"ids": series_id, "limit": 5000, "sort": "asc", "format": "json"},
        )
        response.raise_for_status()
        payload = response.json()
        result: list[IndicatorPoint] = []
        for row in payload.get("data", []):
            if len(row) < SERIES_ROW_FIELDS or row[0] is None or row[1] is None:
                continue
            result.append(
                IndicatorPoint(
                    indicator_code=spec.code,
                    source=self.source,
                    date=date.fromisoformat(row[0]),
                    value=Decimal(str(row[1])) * spec.factor,
                    meta={"series_id": series_id, "unit": spec.unit},
                )
            )
        return result
