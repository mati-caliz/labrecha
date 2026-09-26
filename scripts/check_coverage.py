"""Falla si la cobertura de líneas o la de ramas quedan debajo del estándar.

``--cov-fail-under`` de pytest-cov mira un solo número que mezcla líneas y ramas: con
muchas líneas cubiertas tapa ramas flojas. Este chequeo lee el JSON de coverage y exige
cada umbral por separado.

    python scripts/check_coverage.py coverage.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

MIN_LINE_PERCENT = 80.0
MIN_BRANCH_PERCENT = 70.0
_USAGE = "uso: check_coverage.py <coverage.json>"
_EXPECTED_ARGUMENTS = 2


def coverage_failures(totals: dict[str, float]) -> list[str]:
    """Describe cada umbral incumplido; vacía si la cobertura alcanza."""
    measured = {
        "líneas": (totals["percent_statements_covered"], MIN_LINE_PERCENT),
        "ramas": (totals["percent_branches_covered"], MIN_BRANCH_PERCENT),
    }
    return [
        f"cobertura de {kind}: {value:.1f} % (mínimo {minimum:.0f} %)"
        for kind, (value, minimum) in measured.items()
        if value < minimum
    ]


def main(arguments: list[str]) -> int:
    if len(arguments) != _EXPECTED_ARGUMENTS:
        sys.stderr.write(f"{_USAGE}\n")
        return 2
    totals = json.loads(Path(arguments[1]).read_text(encoding="utf-8"))["totals"]
    failures = coverage_failures(totals)
    for failure in failures:
        sys.stderr.write(f"{failure}\n")
    if failures:
        return 1
    sys.stdout.write(
        f"cobertura: {totals['percent_statements_covered']:.1f} % de líneas, "
        f"{totals['percent_branches_covered']:.1f} % de ramas\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
