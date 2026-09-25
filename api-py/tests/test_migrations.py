from __future__ import annotations

from collections.abc import Iterator

import pytest
from alembic import command
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine, make_url

from labrecha_db import Base
from labrecha_db.migrate import (
    build_config,
    current_revision,
    describe_schema_drift,
    head_revision,
    upgrade,
)

ROUNDTRIP_DATABASE_SUFFIX = "_roundtrip"
MAINTENANCE_DATABASE = "postgres"
BASE_REVISION = "base"
SINGLE_HEAD = 1


def test_migrations_leave_no_drift_against_models(database_url: str) -> None:
    drift = describe_schema_drift(database_url)
    assert drift == [], (
        f"el esquema migrado no coincide con los modelos SQLAlchemy: {drift}. Falta una migración."
    )


def test_database_is_at_head_revision(database_url: str) -> None:
    assert current_revision(database_url) == head_revision()


def test_migration_history_has_a_single_head(database_url: str) -> None:
    heads = ScriptDirectory.from_config(build_config(database_url)).get_heads()
    assert len(heads) == SINGLE_HEAD, f"hay ramas de migración sin mergear: {heads}"


def test_every_model_table_exists_after_upgrade(database_engine: Engine) -> None:
    existing = set(inspect(database_engine).get_table_names())
    missing = set(Base.metadata.tables) - existing
    assert missing == set(), f"la migración no creó estas tablas: {sorted(missing)}"


def test_indicator_history_upsert_constraint_exists(database_engine: Engine) -> None:
    constraints = inspect(database_engine).get_unique_constraints("indicator_history")
    by_name = {constraint["name"]: constraint["column_names"] for constraint in constraints}
    assert by_name.get("uq_indicator_source_date") == ["indicator_code", "source", "date"], (
        "el upsert de indicator_history apunta a esta constraint por nombre; "
        f"constraints presentes: {by_name}"
    )


TERMINATE_BACKENDS = text(
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = :name"
)


def _drop_database(maintenance: Engine, name: str) -> None:
    with maintenance.connect() as connection:
        connection.execute(TERMINATE_BACKENDS, {"name": name})
        connection.execute(text(f'DROP DATABASE IF EXISTS "{name}"'))


@pytest.fixture
def roundtrip_database_url(database_url: str) -> Iterator[str]:
    source = make_url(database_url)
    target_name = f"{source.database}{ROUNDTRIP_DATABASE_SUFFIX}"
    maintenance = create_engine(
        source.set(database=MAINTENANCE_DATABASE), isolation_level="AUTOCOMMIT"
    )
    _drop_database(maintenance, target_name)
    with maintenance.connect() as connection:
        connection.execute(text(f'CREATE DATABASE "{target_name}"'))
    yield source.set(database=target_name).render_as_string(hide_password=False)
    _drop_database(maintenance, target_name)
    maintenance.dispose()


def test_full_downgrade_and_upgrade_roundtrip(roundtrip_database_url: str) -> None:
    upgrade(roundtrip_database_url)
    command.downgrade(build_config(roundtrip_database_url), BASE_REVISION)

    engine = create_engine(roundtrip_database_url)
    try:
        remaining = set(inspect(engine).get_table_names()) & set(Base.metadata.tables)
        assert remaining == set(), f"el downgrade dejó tablas colgadas: {sorted(remaining)}"
    finally:
        engine.dispose()

    upgrade(roundtrip_database_url)
    assert current_revision(roundtrip_database_url) == head_revision()
    assert describe_schema_drift(roundtrip_database_url) == []
