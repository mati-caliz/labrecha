from __future__ import annotations

from fastapi import Request

from labrecha_api.rate_limit import SlidingWindowCounter, client_key

INTERNAL_PEER = "172.18.0.5"
PUBLIC_PEER = "200.10.20.30"
REAL_CLIENT = "181.45.6.7"


def request_with(headers: dict[str, str], peer: str = INTERNAL_PEER) -> Request:
    return Request(
        {
            "type": "http",
            "headers": [(name.encode(), value.encode()) for name, value in headers.items()],
            "client": (peer, 54321),
        }
    )


def test_the_real_ip_header_wins_over_a_forged_forwarded_for() -> None:
    forged = request_with({"x-real-ip": REAL_CLIENT, "x-forwarded-for": "9.9.9.9, 8.8.8.8"})

    assert client_key(forged) == REAL_CLIENT


def test_without_real_ip_the_last_forwarded_hop_is_the_trusted_one() -> None:
    forged = request_with({"x-forwarded-for": f"1.1.1.1, 2.2.2.2, {REAL_CLIENT}"})

    assert client_key(forged) == REAL_CLIENT


def test_a_forged_forwarded_for_cannot_create_new_keys() -> None:
    keys = {
        client_key(request_with({"x-real-ip": REAL_CLIENT, "x-forwarded-for": f"10.0.0.{attempt}"}))
        for attempt in range(100)
    }

    assert keys == {REAL_CLIENT}


def test_the_internal_network_stays_exempt() -> None:
    assert client_key(request_with({})) is None


def test_a_public_peer_without_headers_is_limited_by_its_own_address() -> None:
    assert client_key(request_with({}, peer=PUBLIC_PEER)) == PUBLIC_PEER


def test_an_empty_forwarded_for_falls_back_to_the_peer() -> None:
    assert client_key(request_with({"x-forwarded-for": " , "}, peer=PUBLIC_PEER)) == PUBLIC_PEER


def test_the_counter_blocks_once_the_limit_is_reached() -> None:
    counter = SlidingWindowCounter(limit=3, window_seconds=60)

    assert [counter.retry_after(REAL_CLIENT, 0.0) for _ in range(3)] == [None, None, None]
    assert counter.retry_after(REAL_CLIENT, 0.0) is not None


def test_the_window_slides_and_frees_the_client() -> None:
    counter = SlidingWindowCounter(limit=1, window_seconds=60)

    assert counter.retry_after(REAL_CLIENT, 0.0) is None
    assert counter.retry_after(REAL_CLIENT, 30.0) is not None
    assert counter.retry_after(REAL_CLIENT, 61.0) is None


def test_each_client_has_its_own_budget() -> None:
    counter = SlidingWindowCounter(limit=1, window_seconds=60)

    assert counter.retry_after(REAL_CLIENT, 0.0) is None
    assert counter.retry_after(PUBLIC_PEER, 0.0) is None
