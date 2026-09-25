from __future__ import annotations

from datetime import UTC
from datetime import datetime as datetime_type
from decimal import Decimal

from labrecha_scraper.base import IndicatorConnector, IndicatorPoint
from labrecha_scraper.units import Unit

SIMPLE_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price"
VS_CURRENCY = "usd"

COINGECKO_IDS: dict[str, str] = {
    "btc": "bitcoin",
    "eth": "ethereum",
    "bnb": "binancecoin",
    "xrp": "ripple",
    "ada": "cardano",
    "sol": "solana",
}


class CryptoConnector(IndicatorConnector):
    name = "crypto"
    source = "coingecko"

    def fetch(self) -> list[IndicatorPoint]:
        with self.build_client() as client:
            response = client.get(
                SIMPLE_PRICE_URL,
                params={
                    "ids": ",".join(COINGECKO_IDS.values()),
                    "vs_currencies": VS_CURRENCY,
                    "include_24hr_change": "true",
                },
            )
            response.raise_for_status()
            payload = response.json()

        today = datetime_type.now(UTC).date()
        points: list[IndicatorPoint] = []
        for symbol, coingecko_id in COINGECKO_IDS.items():
            data = payload.get(coingecko_id)
            if data is None:
                continue
            price = data.get(VS_CURRENCY)
            if price is None:
                continue
            change_24h = data.get(f"{VS_CURRENCY}_24h_change")
            points.append(
                IndicatorPoint(
                    indicator_code=f"crypto_{symbol}",
                    source=self.source,
                    date=today,
                    value=Decimal(str(price)),
                    meta={
                        "unit": Unit.USD,
                        "coingecko_id": coingecko_id,
                        "vs_currency": VS_CURRENCY,
                        "change_24h": None if change_24h is None else str(change_24h),
                    },
                )
            )
        return points
