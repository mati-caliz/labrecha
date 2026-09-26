"""Falla si la cobertura queda debajo del estándar, en total o en algún archivo.

``--cov-fail-under`` de pytest-cov mira un solo número que mezcla líneas y ramas: con
muchas líneas cubiertas tapa ramas flojas, y un módulo sin tests se esconde detrás del
promedio. Este chequeo lee el JSON de coverage y exige líneas y ramas por separado, en el
total y con un piso en cada archivo. Lo genera ``quality/sync.sh`` con los umbrales de
``quality/coverage.conf``: no se edita en el repo.

    python scripts/check_coverage.py coverage.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import TypedDict

MIN_TOTAL = {"líneas": 80, "ramas": 70}
MIN_PER_FILE = {"líneas": 50, "ramas": 45}
FULL_PERCENT = 100.0
_USAGE = "uso: check_coverage.py <coverage.json>"
_EXPECTED_ARGUMENTS = 2


class Summary(TypedDict):
    covered_lines: int
    num_statements: int
    covered_branches: int
    num_branches: int


class FileReport(TypedDict):
    summary: Summary


class Report(TypedDict):
    totals: Summary
    files: dict[str, FileReport]


def _percent(covered: int, total: int) -> float:
    return FULL_PERCENT if total == 0 else FULL_PERCENT * covered / total


def measure(summary: Summary) -> dict[str, float]:
    """Líneas y ramas cubiertas, en porcentaje, de un resumen de coverage."""
    return {
        "líneas": _percent(summary["covered_lines"], summary["num_statements"]),
        "ramas": _percent(summary["covered_branches"], summary["num_branches"]),
    }


def coverage_failures(report: Report) -> list[str]:
    """Describe cada umbral incumplido; vacía si la cobertura alcanza."""
    failures = [
        f"total: {value:.1f} % de {kind} (mínimo {MIN_TOTAL[kind]} %)"
        for kind, value in measure(report["totals"]).items()
        if value < MIN_TOTAL[kind]
    ]
    for name, file_report in sorted(report["files"].items()):
        failures.extend(
            f"{name}: {value:.1f} % de {kind} (mínimo por archivo {MIN_PER_FILE[kind]} %)"
            for kind, value in measure(file_report["summary"]).items()
            if value < MIN_PER_FILE[kind]
        )
    return failures


def main(arguments: list[str]) -> int:
    if len(arguments) != _EXPECTED_ARGUMENTS:
        sys.stderr.write(f"{_USAGE}\n")
        return 2
    report: Report = json.loads(Path(arguments[1]).read_text(encoding="utf-8"))
    totals = measure(report["totals"])
    sys.stdout.write(
        f"cobertura: {totals['líneas']:.1f} % de líneas, {totals['ramas']:.1f} % de ramas\n"
    )
    failures = coverage_failures(report)
    if failures:
        sys.stderr.write("Cobertura insuficiente:\n" + "\n".join(failures) + "\n")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
