from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from labrecha_api.config import get_settings

OK = 200
CREATED = 201
NO_CONTENT = 204
UNAUTHORIZED = 401
NOT_FOUND = 404
CONFLICT = 409
UNPROCESSABLE = 422

ADMIN_KEY = "clave-de-posts"
MISSING_POST_ID = 999_999

IMPACT = {"kind": "dinero", "value": "$ 1.200", "label": "ahorro por hogar al año"}


@pytest.fixture
def admin_headers(monkeypatch: pytest.MonkeyPatch) -> dict[str, str]:
    monkeypatch.setattr(get_settings(), "admin_token", ADMIN_KEY)
    return {"X-Admin-Token": ADMIN_KEY}


def _payload(slug: str, **overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "slug": slug,
        "title": f"Título de {slug}",
        "category": "idea",
        "summary": "Resumen",
        "content": "Contenido del post",
        "published": True,
    }
    payload.update(overrides)
    return payload


def _create(client: TestClient, headers: dict[str, str], slug: str, **overrides: object) -> Any:
    response = client.post("/posts", json=_payload(slug, **overrides), headers=headers)
    assert response.status_code == CREATED, response.text
    return response.json()


def test_created_post_is_served_by_slug_with_its_impacts(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    created = _create(client, admin_headers, "subte-gratis", impacts=[IMPACT])

    response = client.get("/posts/subte-gratis")

    assert response.status_code == OK
    post = response.json()
    assert post["id"] == created["id"]
    assert post["category"] == "idea"
    assert post["impacts"] == [IMPACT]


def test_public_listing_hides_drafts_and_filters_by_category(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    _create(client, admin_headers, "una-idea")
    _create(client, admin_headers, "una-ley", category="ley")
    _create(client, admin_headers, "borrador", published=False)

    everything = [post["slug"] for post in client.get("/posts").json()]
    laws = [post["slug"] for post in client.get("/posts", params={"category": "ley"}).json()]
    admin_view = client.get("/posts/all", headers=admin_headers).json()

    assert sorted(everything) == ["una-idea", "una-ley"]
    assert laws == ["una-ley"]
    assert sorted(post["slug"] for post in admin_view) == ["borrador", "una-idea", "una-ley"]
    assert client.get("/posts/borrador").status_code == NOT_FOUND


def test_duplicate_slug_is_a_conflict(client: TestClient, admin_headers: dict[str, str]) -> None:
    _create(client, admin_headers, "repetido")

    response = client.post("/posts", json=_payload("repetido"), headers=admin_headers)

    assert response.status_code == CONFLICT


def test_writing_posts_requires_the_admin_token(client: TestClient) -> None:
    assert client.post("/posts", json=_payload("sin-token")).status_code == UNAUTHORIZED
    assert client.put("/posts/1", json={"title": "x"}).status_code == UNAUTHORIZED
    assert client.delete("/posts/1").status_code == UNAUTHORIZED


def test_invalid_slug_is_rejected(client: TestClient, admin_headers: dict[str, str]) -> None:
    response = client.post("/posts", json=_payload("Con Espacios"), headers=admin_headers)

    assert response.status_code == UNPROCESSABLE


def test_update_changes_only_the_sent_fields(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    created = _create(client, admin_headers, "original", impacts=[IMPACT])

    response = client.put(
        f"/posts/{created['id']}",
        json={"slug": "renombrado", "category": "analisis", "impacts": None},
        headers=admin_headers,
    )

    assert response.status_code == OK
    updated = response.json()
    assert updated["slug"] == "renombrado"
    assert updated["category"] == "analisis"
    assert updated["impacts"] is None
    assert updated["title"] == created["title"]
    assert updated["updated_at"] >= created["updated_at"]
    assert client.get("/posts/original").status_code == NOT_FOUND


def test_update_keeping_the_same_slug_is_not_a_conflict(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    created = _create(client, admin_headers, "mismo-slug")

    response = client.put(
        f"/posts/{created['id']}",
        json={"slug": "mismo-slug", "title": "Nuevo título"},
        headers=admin_headers,
    )

    assert response.status_code == OK
    assert response.json()["title"] == "Nuevo título"


def test_update_to_a_taken_slug_is_a_conflict(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    _create(client, admin_headers, "ocupado")
    other = _create(client, admin_headers, "libre")

    response = client.put(f"/posts/{other['id']}", json={"slug": "ocupado"}, headers=admin_headers)

    assert response.status_code == CONFLICT


def test_delete_removes_the_post(client: TestClient, admin_headers: dict[str, str]) -> None:
    created = _create(client, admin_headers, "efimero")

    assert client.delete(f"/posts/{created['id']}", headers=admin_headers).status_code == NO_CONTENT
    assert client.get("/posts/efimero").status_code == NOT_FOUND


@pytest.mark.parametrize("method", ["put", "delete"])
def test_missing_post_is_not_found(
    client: TestClient, admin_headers: dict[str, str], method: str
) -> None:
    response = client.request(
        method.upper(),
        f"/posts/{MISSING_POST_ID}",
        json={"title": "x"} if method == "put" else None,
        headers=admin_headers,
    )

    assert response.status_code == NOT_FOUND
