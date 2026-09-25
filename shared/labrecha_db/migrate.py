from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import Connection, create_engine, inspect

from labrecha_db.models import Base

MIGRATIONS_PATH = Path(__file__).resolve().parent / "migrations"


@contextmanager
def _connection(database_url: str) -> Iterator[Connection]:
    engine = create_engine(database_url)
    try:
        with engine.connect() as connection:
            yield connection
    finally:
        engine.dispose()


def build_config(database_url: str) -> Config:
    config = Config()
    config.set_main_option("script_location", str(MIGRATIONS_PATH))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def upgrade(database_url: str, revision: str = "head") -> None:
    command.upgrade(build_config(database_url), revision)


def has_managed_tables(database_url: str) -> bool:
    with _connection(database_url) as connection:
        existing = set(inspect(connection).get_table_names())
    return any(table in existing for table in Base.metadata.tables)


def stamp(database_url: str, revision: str = "head") -> None:
    command.stamp(build_config(database_url), revision)


def current_revision(database_url: str) -> str | None:
    with _connection(database_url) as connection:
        return MigrationContext.configure(connection).get_current_revision()


def head_revision() -> str | None:
    return ScriptDirectory.from_config(build_config("")).get_current_head()


def describe_schema_drift(database_url: str) -> list[str]:
    drift: list[str] = []
    with _connection(database_url) as connection:
        context = MigrationContext.configure(connection)
        for difference in compare_metadata(context, Base.metadata):
            description = _describe(difference)
            if description is not None:
                drift.append(description)
    return drift


def _difference_table_name(subject: object) -> str:
    table = getattr(subject, "table", None)
    if table is not None:
        return str(table.name)
    return str(getattr(subject, "name", ""))


def _describe(difference: tuple[Any, ...] | list[Any]) -> str | None:
    if isinstance(difference, list):
        return "; ".join(filter(None, (_describe(item) for item in difference)))
    action = difference[0]
    subject = difference[-1]
    table_name = _difference_table_name(subject)
    if table_name not in Base.metadata.tables:
        return None
    detail = str(getattr(subject, "name", ""))
    return f"{action}: {table_name}.{detail}" if detail != table_name else f"{action}: {table_name}"
