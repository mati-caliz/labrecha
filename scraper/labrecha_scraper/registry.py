from __future__ import annotations

from labrecha_scraper.base import Connector
from labrecha_scraper.connectors.bcra_rates import BcraRatesConnector
from labrecha_scraper.connectors.big_mac import BigMacConnector
from labrecha_scraper.connectors.congress import CongressConnector
from labrecha_scraper.connectors.congress_summaries import CongressSummariesConnector
from labrecha_scraper.connectors.country_risk import CountryRiskConnector
from labrecha_scraper.connectors.cpi_jurisdictions import CpiJurisdictionsConnector
from labrecha_scraper.connectors.credit_bcra import CreditBcraConnector
from labrecha_scraper.connectors.crypto import CryptoConnector
from labrecha_scraper.connectors.crypto_historical import CryptoHistoricalConnector
from labrecha_scraper.connectors.derived import DerivedIndicatorsConnector
from labrecha_scraper.connectors.dollar import DollarConnector
from labrecha_scraper.connectors.dollar_historical import DollarHistoricalConnector
from labrecha_scraper.connectors.hcdn_votes import HcdnVotesConnector
from labrecha_scraper.connectors.holidays import HolidaysConnector
from labrecha_scraper.connectors.icg import IcgConnector
from labrecha_scraper.connectors.icl_bcra import IclBcraConnector
from labrecha_scraper.connectors.inflation import InflationConnector
from labrecha_scraper.connectors.laws import LawsConnector
from labrecha_scraper.connectors.monetary_base_bcra import MonetaryBaseBcraConnector
from labrecha_scraper.connectors.news import NewsConnector
from labrecha_scraper.connectors.official_gazette import OfficialGazetteConnector
from labrecha_scraper.connectors.rent_caba import RentCabaConnector
from labrecha_scraper.connectors.reserves_bcra import ReservesBcraConnector
from labrecha_scraper.connectors.senate import SenateConnector
from labrecha_scraper.connectors.senate_votes import SenateVotesConnector
from labrecha_scraper.connectors.series_datosgob import SeriesDatosGobConnector

DISABLED_CONNECTOR_NAMES = frozenset({"hcdn_votes", "official_gazette"})

CONNECTORS: dict[str, Connector] = {
    connector.name: connector
    for connector in (
        RentCabaConnector(),
        BcraRatesConnector(),
        BigMacConnector(),
        OfficialGazetteConnector(),
        CongressConnector(),
        CongressSummariesConnector(),
        CreditBcraConnector(),
        CpiJurisdictionsConnector(),
        CryptoConnector(),
        CryptoHistoricalConnector(),
        DollarConnector(),
        DollarHistoricalConnector(),
        HcdnVotesConnector(),
        HolidaysConnector(),
        IclBcraConnector(),
        IcgConnector(),
        InflationConnector(),
        MonetaryBaseBcraConnector(),
        LawsConnector(),
        NewsConnector(),
        ReservesBcraConnector(),
        CountryRiskConnector(),
        SenateConnector(),
        SenateVotesConnector(),
        SeriesDatosGobConnector(),
        DerivedIndicatorsConnector(),
    )
}

ACTIVE_CONNECTORS: dict[str, Connector] = {
    name: connector
    for name, connector in CONNECTORS.items()
    if name not in DISABLED_CONNECTOR_NAMES
}


def get_connector(name: str) -> Connector:
    if name not in CONNECTORS:
        available = ", ".join(sorted(CONNECTORS))
        raise KeyError(f"job desconocido: {name}. Disponibles: {available}")
    return CONNECTORS[name]
