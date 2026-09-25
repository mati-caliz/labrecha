from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import Header, HTTPException

from labrecha_api.config import get_settings

UNAUTHORIZED_DETAIL = "No autorizado"


def token_matches(candidate: str) -> bool:
    admin_token = get_settings().admin_token
    return bool(admin_token) and secrets.compare_digest(candidate, admin_token)


def require_admin(x_admin_token: Annotated[str, Header()] = "") -> None:
    if not token_matches(x_admin_token):
        raise HTTPException(status_code=401, detail=UNAUTHORIZED_DETAIL)


def is_admin(x_admin_token: Annotated[str, Header()] = "") -> bool:
    return token_matches(x_admin_token)
