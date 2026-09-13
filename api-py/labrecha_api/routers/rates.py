from __future__ import annotations

import json
from datetime import date
from decimal import Decimal
from urllib.error import URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException

from labrecha_api.schemas import RateOut

router = APIRouter(prefix="/rates", tags=["rates"])
API_HOST_AND_PATH = "api.argentinadatos.com/v1/finanzas"
HEADERS = {"Accept": "application/json", "User-Agent": "labrecha-api/1.0"}


def _get(path: str) -> tuple[object, int]:
    try:
        with urlopen(
            Request(f"https://{API_HOST_AND_PATH}/{path}", headers=HEADERS), timeout=20
        ) as response:
            return json.load(response), int(response.headers.get("Age", "0"))
    except (URLError, TimeoutError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=503, detail="tasas temporalmente no disponibles") from error


def _percent(value: object) -> Decimal:
    return Decimal(str(value)) * 100


def _wallet_details(wallet_yield: dict[str, object]) -> dict[str, object]:
    bonus = {
        "bono": wallet_yield.get("bonusValue"),
        "tope_bono": wallet_yield.get("bonusThreshold"),
    }
    return {key: value for key, value in bonus.items() if value is not None}


def _fixed_term_details(item: dict[str, object]) -> dict[str, float]:
    non_client_rate = item.get("tnaNoClientes")
    if not non_client_rate:
        return {}
    return {"tna_no_clientes": float(_percent(non_client_rate))}


@router.get("/wallets", response_model=list[RateOut])
def wallets() -> list[RateOut]:
    payload, _ = _get("rendimientos")
    rows: list[RateOut] = []
    for entity in payload:
        for yield_ in entity.get("rendimientos", []):
            if yield_.get("moneda") != "ARS" or yield_.get("apy") is None:
                continue
            rows.append(
                RateOut(
                    id=f"{entity['entidad']}-ars",
                    name=entity["entidad"].title(),
                    tna=Decimal(str(yield_["apy"])),
                    tea=Decimal(str(yield_["apy"])),
                    product="Cuenta remunerada en pesos",
                    updated_at=date.fromisoformat(yield_["fecha"]),
                    details=_wallet_details(yield_),
                )
            )
    return sorted(rows, key=lambda row: row.tna, reverse=True)


@router.get("/fixed-term", response_model=list[RateOut])
def fixed_term() -> list[RateOut]:
    payload, _ = _get("tasas/plazoFijo")
    return sorted(
        [
            RateOut(
                id=item["entidad"],
                name=item["entidad"].title(),
                tna=_percent(item["tnaClientes"]),
                product="Plazo fijo online · clientes · referencia 30 días",
                link=item.get("enlace"),
                details=_fixed_term_details(item),
            )
            for item in payload
            if item.get("tnaClientes")
        ],
        key=lambda row: row.tna,
        reverse=True,
    )


@router.get("/uva-mortgages", response_model=list[RateOut])
def uva_mortgages() -> list[RateOut]:
    payload, _ = _get("creditos/hipotecariosUva")
    return sorted(
        [
            RateOut(
                id=item["entidad"],
                name=item.get("nombreComercial") or item["entidad"],
                tna=_percent(item["tna"]),
                product="Crédito hipotecario UVA",
                details=item.get("metadata") or {},
            )
            for item in payload
            if item.get("tna") is not None
        ],
        key=lambda row: row.tna,
    )
