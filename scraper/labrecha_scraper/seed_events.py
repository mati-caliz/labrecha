from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from labrecha_db import PoliticalEvent

EVENTS: list[dict[str, Any]] = [
    {
        "date": date(2001, 12, 20),
        "title": "Renuncia de De la Rúa",
        "category": "cambio_gobierno",
        "description": "Estallido de la crisis de 2001.",
    },
    {
        "date": date(2002, 1, 6),
        "title": "Fin de la convertibilidad",
        "category": "medida_economica",
        "description": "Devaluación y salida del 1 a 1.",
    },
    {
        "date": date(2003, 5, 25),
        "title": "Asunción de Néstor Kirchner",
        "category": "cambio_gobierno",
    },
    {
        "date": date(2007, 1, 29),
        "title": "Intervención del INDEC",
        "category": "medida_economica",
        "description": "Inicio del cuestionamiento a las estadísticas oficiales de inflación.",
    },
    {
        "date": date(2007, 12, 10),
        "title": "Asunción de Cristina Fernández (1° mandato)",
        "category": "cambio_gobierno",
    },
    {
        "date": date(2011, 10, 23),
        "title": "Reelección de Cristina Fernández",
        "category": "eleccion",
    },
    {
        "date": date(2011, 10, 31),
        "title": "Cepo cambiario",
        "category": "medida_economica",
        "description": "Restricciones a la compra de dólares.",
    },
    {
        "date": date(2015, 12, 10),
        "title": "Asunción de Mauricio Macri",
        "category": "cambio_gobierno",
    },
    {
        "date": date(2015, 12, 17),
        "title": "Salida del cepo y devaluación",
        "category": "medida_economica",
    },
    {
        "date": date(2018, 6, 7),
        "title": "Acuerdo con el FMI",
        "category": "medida_economica",
        "description": "Stand-by por USD 50.000 millones (luego ampliado).",
    },
    {
        "date": date(2019, 8, 11),
        "title": "PASO 2019",
        "category": "eleccion",
        "description": "Salto del dólar y del riesgo país tras el resultado.",
    },
    {
        "date": date(2019, 12, 10),
        "title": "Asunción de Alberto Fernández",
        "category": "cambio_gobierno",
    },
    {
        "date": date(2020, 3, 20),
        "title": "Inicio de la cuarentena por COVID-19",
        "category": "medida_economica",
    },
    {"date": date(2023, 8, 13), "title": "PASO 2023", "category": "eleccion"},
    {"date": date(2023, 11, 19), "title": "Balotaje 2023: gana Milei", "category": "eleccion"},
    {
        "date": date(2023, 12, 10),
        "title": "Asunción de Javier Milei",
        "category": "cambio_gobierno",
    },
    {
        "date": date(2023, 12, 12),
        "title": "Devaluación del 54%",
        "category": "medida_economica",
        "description": "Salto del oficial a $800 al inicio de la gestión Caputo.",
    },
    {
        "date": date(2023, 12, 20),
        "title": "DNU 70/2023 de desregulación económica",
        "category": "dnu",
    },
    {"date": date(2024, 6, 27), "title": "Aprobación de la Ley Bases", "category": "ley"},
]


def seed_events(session: Session) -> int:
    rows = [
        {
            "date": event["date"],
            "title": event["title"],
            "category": event["category"],
            "description": event.get("description"),
        }
        for event in EVENTS
    ]
    statement = insert(PoliticalEvent).values(rows)
    statement = statement.on_conflict_do_update(
        constraint="uq_event_date_title",
        set_={
            "category": statement.excluded.category,
            "description": statement.excluded.description,
        },
    )
    session.execute(statement)
    session.commit()
    return len(rows)
