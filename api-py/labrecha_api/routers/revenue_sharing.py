from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from labrecha_api.db import get_session
from labrecha_api.schemas import RevenueSharingShareOut
from labrecha_db import RevenueSharingShare

router = APIRouter(prefix="/revenue-sharing", tags=["revenue-sharing"])

ONE_HUNDRED = Decimal(100)
SHARE_PRECISION = Decimal("0.01")


@router.get("", response_model=list[RevenueSharingShareOut])
def list_shares(session: Annotated[Session, Depends(get_session)]) -> list[RevenueSharingShareOut]:
    rows = session.scalars(
        select(RevenueSharingShare).order_by(RevenueSharingShare.coefficient.desc())
    ).all()
    total = sum((row.coefficient for row in rows), Decimal(0))
    return [
        RevenueSharingShareOut(
            province=row.province,
            coefficient=row.coefficient,
            share_pct=(
                (row.coefficient / total * ONE_HUNDRED).quantize(
                    SHARE_PRECISION, rounding=ROUND_HALF_UP
                )
                if total > 0
                else Decimal(0)
            ),
        )
        for row in rows
    ]
