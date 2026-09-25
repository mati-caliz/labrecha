from __future__ import annotations

from decimal import Decimal

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from labrecha_db import RevenueSharingShare

SOURCE = "cfi"

SHARES: dict[str, str] = {
    "Buenos Aires": "0.12463838",
    "CABA": "0.03750000",
    "Catamarca": "0.01563276",
    "Córdoba": "0.05039652",
    "Corrientes": "0.02109876",
    "Chaco": "0.02831388",
    "Chubut": "0.00897608",
    "Entre Ríos": "0.02771262",
    "Formosa": "0.02066148",
    "Jujuy": "0.01612470",
    "La Pampa": "0.01065870",
    "La Rioja": "0.01175190",
    "Mendoza": "0.02366778",
    "Misiones": "0.01874838",
    "Neuquén": "0.00985064",
    "Río Negro": "0.01432092",
    "Salta": "0.02175468",
    "San Juan": "0.01918566",
    "San Luis": "0.01295442",
    "Santa Cruz": "0.00897608",
    "Santa Fe": "0.05072448",
    "Santiago del Estero": "0.02344914",
    "Tucumán": "0.02700204",
    "Tierra del Fuego": "0.00700000",
}


def seed_revenue_sharing(session: Session) -> int:
    rows = [
        {"province": province, "coefficient": Decimal(coefficient), "source": SOURCE}
        for province, coefficient in SHARES.items()
    ]
    statement = insert(RevenueSharingShare).values(rows)
    statement = statement.on_conflict_do_update(
        index_elements=["province"],
        set_={"coefficient": statement.excluded.coefficient, "source": statement.excluded.source},
    )
    session.execute(statement)
    session.commit()
    return len(rows)
