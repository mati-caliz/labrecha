from __future__ import annotations

import json
import subprocess
from typing import Any

CLAUDE_BIN = "claude"
CLAUDE_TIMEOUT_SECONDS = 300


class LlmError(RuntimeError):
    pass


def _extract_json_array(text: str) -> list[Any]:
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1 or end < start:
        raise LlmError(f"la respuesta del LLM no contiene un array JSON: {text[:200]}")
    items: list[Any] = json.loads(text[start : end + 1])
    return items


def run_claude_json_array(prompt: str) -> list[Any]:
    try:
        completed = subprocess.run(
            [CLAUDE_BIN, "-p", prompt],
            capture_output=True,
            text=True,
            check=False,
            timeout=CLAUDE_TIMEOUT_SECONDS,
        )
    except FileNotFoundError as error:
        raise LlmError(f"no se encontró el binario '{CLAUDE_BIN}' en el host") from error
    except subprocess.TimeoutExpired as error:
        raise LlmError("timeout esperando la respuesta de claude") from error

    if completed.returncode != 0:
        raise LlmError(f"claude devolvió código {completed.returncode}: {completed.stderr[:300]}")

    return _extract_json_array(completed.stdout)
