from __future__ import annotations

import logging
import time
from collections.abc import Callable

import httpx

logger = logging.getLogger("labrecha_scraper")

RETRYABLE_STATUS_CODES = frozenset({429, 500, 502, 503, 504})
RETRYABLE_ERRORS = (httpx.TimeoutException, httpx.NetworkError)
BACKOFF_BASE_SECONDS = 1.0
BACKOFF_MAX_SECONDS = 20.0


class InvalidResponseError(ValueError):
    pass


def _retry_delay(attempt: int) -> float:
    return min(BACKOFF_BASE_SECONDS * 2.0 ** (attempt - 1), BACKOFF_MAX_SECONDS)


def retry_invalid_response[ResponseData](
    operation: Callable[[], ResponseData],
    *,
    source: str,
    max_attempts: int,
) -> ResponseData:
    for attempt in range(1, max_attempts):
        try:
            return operation()
        except InvalidResponseError as error:
            delay = _retry_delay(attempt)
            logger.warning(
                "%s devolvio contenido invalido (%s); reintento %d/%d en %.1fs",
                source,
                error,
                attempt + 1,
                max_attempts,
                delay,
            )
            time.sleep(delay)
    return operation()


class RetryingTransport(httpx.BaseTransport):
    def __init__(self, wrapped: httpx.BaseTransport, max_attempts: int) -> None:
        self._wrapped = wrapped
        self._max_attempts = max_attempts

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        # El último intento queda fuera del bucle para que su excepción llegue al conector
        # tal cual y su 5xx lo levante `raise_for_status()` con el cuerpo original.
        for attempt in range(1, self._max_attempts):
            try:
                response = self._wrapped.handle_request(request)
            except RETRYABLE_ERRORS as error:
                self._wait_before_retry(request, attempt, type(error).__name__)
                continue
            if response.status_code not in RETRYABLE_STATUS_CODES:
                return response
            response.close()
            self._wait_before_retry(request, attempt, f"HTTP {response.status_code}")
        return self._wrapped.handle_request(request)

    def close(self) -> None:
        self._wrapped.close()

    def _wait_before_retry(self, request: httpx.Request, attempt: int, reason: str) -> None:
        delay = _retry_delay(attempt)
        logger.warning(
            "%s fallo por %s; reintento %d/%d en %.1fs",
            request.url,
            reason,
            attempt + 1,
            self._max_attempts,
            delay,
        )
        time.sleep(delay)
