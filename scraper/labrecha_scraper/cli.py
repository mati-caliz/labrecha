from __future__ import annotations

import argparse
import sys
import time
from collections.abc import Callable

from sqlalchemy import select

from labrecha_db import ScrapeRun
from labrecha_db.migrate import (
    current_revision,
    describe_schema_drift,
    has_managed_tables,
    head_revision,
    stamp,
    upgrade,
)
from labrecha_scraper.base import STATUS_SUCCESS, run_job
from labrecha_scraper.config import settings
from labrecha_scraper.db import SessionLocal
from labrecha_scraper.logging_setup import configure_logging
from labrecha_scraper.prune_errors import prune_error_events
from labrecha_scraper.registry import ACTIVE_CONNECTORS, get_connector
from labrecha_scraper.seed_events import seed_events
from labrecha_scraper.seed_revenue_sharing import seed_revenue_sharing
from labrecha_scraper.seed_taxes import seed_taxes

FAILED_JOB_RETRY_DELAY_SECONDS = 60


def _db_upgrade() -> int:
    if current_revision(settings.database_url) is None and has_managed_tables(
        settings.database_url
    ):
        drift = describe_schema_drift(settings.database_url)
        if drift:
            print("la base ya tiene tablas pero su esquema difiere de los modelos:")
            for difference in drift:
                print(f"  - {difference}")
            print("no se aplican migraciones a ciegas: revisá las diferencias o usá 'db stamp'")
            return 1
        stamp(settings.database_url)
        print(
            "base preexistente adoptada por Alembic (esquema idéntico a los modelos): "
            f"revisión {current_revision(settings.database_url)}"
        )
        return 0

    upgrade(settings.database_url)
    print(f"migraciones aplicadas: revisión actual {current_revision(settings.database_url)}")
    return 0


def _db_current() -> int:
    print(f"revisión en la base: {current_revision(settings.database_url) or 'ninguna'}")
    print(f"revisión más nueva del código: {head_revision() or 'ninguna'}")
    return 0


def _db_check() -> int:
    drift = describe_schema_drift(settings.database_url)
    if not drift:
        print("el esquema de la base coincide con los modelos")
        return 0
    print(f"el esquema difiere de los modelos en {len(drift)} punto(s):")
    for difference in drift:
        print(f"  - {difference}")
    return 1


def _db_stamp(*, force: bool) -> int:
    if not force and _db_check() != 0:
        print("stamp cancelado: corregí las diferencias o volvé a correr con --force")
        return 1
    stamp(settings.database_url)
    print(f"base marcada en la revisión {current_revision(settings.database_url)}")
    return 0


def _first_line(error: str | None) -> str:
    return error.splitlines()[0] if error else ""


def _list_jobs() -> None:
    for name in sorted(ACTIVE_CONNECTORS):
        print(f"{name:20s} source={ACTIVE_CONNECTORS[name].source}")


def _run_jobs(names: list[str]) -> list[str]:
    failures: list[str] = []
    with SessionLocal() as session:
        for name in names:
            connector = get_connector(name)
            run = run_job(session, connector)
            print(f"{name:20s} {run.status:8s} filas={run.rows_upserted} {_first_line(run.error)}")
            if run.status != STATUS_SUCCESS:
                failures.append(name)
    return failures


def _run(job: str) -> int:
    jobs = list(ACTIVE_CONNECTORS) if job == "all" else [job]
    failures = _run_jobs(jobs)
    if job == "all" and failures:
        print(
            f"\nReintentando {len(failures)} job(s) fallido(s) "
            f"en {FAILED_JOB_RETRY_DELAY_SECONDS} segundos: {', '.join(failures)}"
        )
        time.sleep(FAILED_JOB_RETRY_DELAY_SECONDS)
        failures = _run_jobs(failures)
    if failures:
        print(f"\nFallos definitivos: {', '.join(failures)}")
    return len(failures)


def _seed_events() -> None:
    with SessionLocal() as session:
        count = seed_events(session)
    print(f"political_events sembrados/actualizados: {count}")


def _seed_taxes() -> None:
    with SessionLocal() as session:
        count = seed_taxes(session)
    print(f"indicadores de tributos (IARAF) sembrados/actualizados: {count}")


def _seed_revenue_sharing() -> None:
    with SessionLocal() as session:
        count = seed_revenue_sharing(session)
    print(f"coeficientes de coparticipación (CFI) sembrados/actualizados: {count}")


def _prune_errors() -> None:
    with SessionLocal() as session:
        result = prune_error_events(
            session,
            retention_days=settings.error_retention_days,
            max_rows=settings.error_max_rows,
        )
    print(
        f"error_events podados: {result.total} "
        f"(vencidos: {result.expired}, excedentes: {result.overflowing})"
    )


def _status() -> None:
    with SessionLocal() as session:
        for name in sorted(ACTIVE_CONNECTORS):
            run = session.scalars(
                select(ScrapeRun)
                .where(ScrapeRun.job_name == name)
                .order_by(ScrapeRun.started_at.desc())
                .limit(1)
            ).first()
            if run is None:
                print(f"{name:20s} sin corridas")
            else:
                print(
                    f"{name:20s} {run.status:8s} filas={run.rows_upserted} "
                    f"inicio={run.started_at:%Y-%m-%d %H:%M} {_first_line(run.error)}"
                )


COMMAND_HANDLERS: dict[str, Callable[[], None]] = {
    "list": _list_jobs,
    "seed-events": _seed_events,
    "seed-taxes": _seed_taxes,
    "seed-revenue-sharing": _seed_revenue_sharing,
    "prune-errors": _prune_errors,
    "status": _status,
}

DB_HANDLERS: dict[str, Callable[[], int]] = {
    "upgrade": _db_upgrade,
    "current": _db_current,
    "check": _db_check,
}


def _configure_db_parser(db_parser: argparse.ArgumentParser) -> None:
    db_subparsers = db_parser.add_subparsers(dest="db_command", required=True)
    db_subparsers.add_parser("upgrade", help="aplicar las migraciones pendientes")
    db_subparsers.add_parser("current", help="revisión aplicada vs. revisión del código")
    db_subparsers.add_parser("check", help="comparar el esquema de la base con los modelos")
    stamp_parser = db_subparsers.add_parser(
        "stamp", help="marcar una base preexistente como migrada, sin ejecutar DDL"
    )
    stamp_parser.add_argument(
        "--force", action="store_true", help="marcar aunque el esquema difiera de los modelos"
    )


def _run_db_command(args: argparse.Namespace) -> int:
    if args.db_command == "stamp":
        return _db_stamp(force=args.force)
    return DB_HANDLERS[args.db_command]()


def main(argv: list[str] | None = None) -> int:
    configure_logging()
    parser = argparse.ArgumentParser(prog="labrecha-scraper")
    subparsers = parser.add_subparsers(dest="command", required=True)

    _configure_db_parser(subparsers.add_parser("db", help="migraciones del esquema (Alembic)"))
    subparsers.add_parser("list", help="listar jobs disponibles")
    subparsers.add_parser("seed-events", help="sembrar hitos políticos curados")
    subparsers.add_parser("seed-taxes", help="sembrar conteo de tributos (IARAF)")
    subparsers.add_parser("seed-revenue-sharing", help="sembrar coeficientes Ley 23.548 (CFI)")
    subparsers.add_parser(
        "prune-errors", help="borrar error_events vencidos y recortar al tope configurado"
    )
    subparsers.add_parser("status", help="última corrida de cada job")
    run_parser = subparsers.add_parser("run", help="correr un job o 'all'")
    run_parser.add_argument("job", help="nombre del job o 'all'")

    args = parser.parse_args(argv)

    if args.command == "db":
        return _run_db_command(args)
    if args.command == "run":
        return _run(args.job)
    handler = COMMAND_HANDLERS.get(args.command)
    if handler is None:
        return 1
    handler()
    return 0


if __name__ == "__main__":
    sys.exit(main())
