from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select

from labrecha_api.db import SessionDependency
from labrecha_api.schemas import NewsArticleOut
from labrecha_db import NewsArticle

router = APIRouter(prefix="/news", tags=["news"])


@router.get("", response_model=list[NewsArticleOut])
def list_news(
    *,
    source: Annotated[str | None, Query()] = None,
    category: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    session: SessionDependency,
) -> list[NewsArticleOut]:
    conditions = []
    if source is not None:
        conditions.append(NewsArticle.source == source)
    if category is not None:
        conditions.append(NewsArticle.category == category)

    statement = (
        select(NewsArticle)
        .where(*conditions)
        .order_by(NewsArticle.published_date.desc())
        .limit(limit)
        .offset(offset)
    )
    return [
        NewsArticleOut(
            title=article.title,
            summary=article.summary,
            source=article.source,
            source_url=article.source_url,
            category=article.category,
            published_date=article.published_date,
            image_url=article.image_url,
        )
        for article in session.scalars(statement).all()
    ]
