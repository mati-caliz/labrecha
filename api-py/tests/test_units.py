from __future__ import annotations

import json

from labrecha_scraper.units import Unit

STORED_VALUES = {
    "ARS": "ARS",
    "ARS_MILLIONS": "ARS_millones",
    "ARS_PER_USD": "ARS_por_USD",
    "USD": "USD",
    "USD_MILLIONS": "USD_millones",
    "PERCENT": "%",
    "ANNUAL_NOMINAL_RATE": "TNA_%",
    "INDEX": "indice",
    "POINTS": "puntos",
    "THOUSANDS_OF_PEOPLE": "miles_personas",
    "BENEFITS": "prestaciones",
    "TAXES": "tributos",
}


def test_the_stored_value_of_every_unit_is_pinned() -> None:
    assert {member.name: member.value for member in Unit} == STORED_VALUES, (
        "el valor de una unidad es lo que se guarda en indicator_history.meta y lo que el "
        "ranking de brechas compara: cambiarlo parte la serie en dos mitades incomparables"
    )


def test_units_serialize_to_jsonb_as_plain_strings() -> None:
    assert json.dumps({"unit": Unit.PERCENT}) == '{"unit": "%"}'
    assert json.dumps({"unit": Unit.ARS_MILLIONS}) == '{"unit": "ARS_millones"}'


def test_units_compare_equal_to_the_strings_already_in_the_database() -> None:
    stored_percent: str = "%"
    stored_index: str = "indice"
    assert stored_percent == Unit.PERCENT
    assert stored_index == Unit.INDEX
