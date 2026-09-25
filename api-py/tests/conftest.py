from __future__ import annotations

import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from labrecha_db import Base
from labrecha_db.migrate import upgrade

DEFAULT_TEST_DATABASE_URL = (
    "postgresql+psycopg2://labrecha:labrecha123@localhost:5433/labrecha_test"
)
REQUIRE_TEST_DATABASE = os.environ.get("REQUIRE_TEST_DATABASE") == "1"
MAINTENANCE_DATABASE = "postgres"
RATE_LIMIT_DISABLED = "1000000"


def configured_database_url() -> str:
    return os.environ.get("TEST_DATABASE_URL", DEFAULT_TEST_DATABASE_URL)


CONFIGURED_DATABASE_URL = configured_database_url()

os.environ["DATABASE_URL"] = CONFIGURED_DATABASE_URL
os.environ["RATE_LIMIT_PER_MINUTE"] = RATE_LIMIT_DISABLED


def _unreachable_reason(url: str) -> str:
    return (
        f"no hay PostgreSQL de test en {url}. Levantalo con `docker compose up -d postgres` "
        "o exportá TEST_DATABASE_URL apuntando a otra instancia."
    )


def _create_database_if_missing(url: str) -> None:
    target = make_url(url).database
    maintenance = make_url(url).set(database=MAINTENANCE_DATABASE)
    engine = create_engine(maintenance, isolation_level="AUTOCOMMIT")
    try:
        with engine.connect() as connection:
            exists = connection.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": target}
            ).scalar()
            if exists is None:
                connection.execute(text(f'CREATE DATABASE "{target}"'))
    finally:
        engine.dispose()


@pytest.fixture(scope="session")
def database_url() -> str:
    url = CONFIGURED_DATABASE_URL
    try:
        _create_database_if_missing(url)
    except OperationalError:
        if REQUIRE_TEST_DATABASE:
            pytest.fail(_unreachable_reason(url))
        pytest.skip(_unreachable_reason(url), allow_module_level=True)
    upgrade(url)
    return url


@pytest.fixture(scope="session")
def database_engine(database_url: str) -> Iterator[Engine]:
    engine = create_engine(database_url, future=True)
    yield engine
    engine.dispose()


DATABASE_FIXTURES = frozenset({"database_engine", "db_session", "client"})


@pytest.fixture(autouse=True)
def clean_tables(request: pytest.FixtureRequest) -> None:
    if DATABASE_FIXTURES.isdisjoint(request.fixturenames):
        return
    engine = request.getfixturevalue("database_engine")
    tables = ", ".join(f'"{name}"' for name in Base.metadata.tables)
    with engine.begin() as connection:
        connection.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))


@pytest.fixture
def db_session(database_engine: Engine) -> Iterator[Session]:
    with Session(bind=database_engine, expire_on_commit=False) as session:
        yield session


@pytest.fixture
def client(request: pytest.FixtureRequest) -> Iterator[TestClient]:
    request.getfixturevalue("database_engine")
    from labrecha_api.main import app

    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
