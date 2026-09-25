from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import ColumnElement, select
from sqlalchemy.orm import Session

from labrecha_api.admin_auth import require_admin
from labrecha_api.db import SessionDependency, get_session
from labrecha_api.schemas import PostCategory, PostCreate, PostImpact, PostOut, PostUpdate
from labrecha_db import Post

router = APIRouter(prefix="/posts", tags=["posts"])


def to_post_out(post: Post) -> PostOut:
    return PostOut(
        id=post.id,
        slug=post.slug,
        title=post.title,
        category=PostCategory(post.category),
        summary=post.summary,
        content=post.content,
        impacts=[PostImpact.model_validate(impact) for impact in post.impacts]
        if post.impacts is not None
        else None,
        published=post.published,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


@router.get("", response_model=list[PostOut])
def list_published_posts(
    *,
    category: Annotated[PostCategory | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    session: SessionDependency,
) -> list[PostOut]:
    conditions: list[ColumnElement[bool]] = [Post.published.is_(True)]
    if category is not None:
        conditions.append(Post.category == category.value)
    statement = (
        select(Post).where(*conditions).order_by(Post.created_at.desc()).limit(limit).offset(offset)
    )
    return [to_post_out(post) for post in session.scalars(statement).all()]


@router.get("/all", response_model=list[PostOut], dependencies=[Depends(require_admin)])
def list_all_posts(session: Annotated[Session, Depends(get_session)]) -> list[PostOut]:
    statement = select(Post).order_by(Post.created_at.desc())
    return [to_post_out(post) for post in session.scalars(statement).all()]


@router.get("/{slug}", response_model=PostOut)
def get_published_post(slug: str, session: Annotated[Session, Depends(get_session)]) -> PostOut:
    post = session.scalars(select(Post).where(Post.slug == slug, Post.published.is_(True))).first()
    if post is None:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    return to_post_out(post)


@router.post("", response_model=PostOut, status_code=201, dependencies=[Depends(require_admin)])
def create_post(payload: PostCreate, session: Annotated[Session, Depends(get_session)]) -> PostOut:
    existing = session.scalars(select(Post).where(Post.slug == payload.slug)).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Ya existe un post con ese slug")
    now = datetime.now(UTC)
    post = Post(
        slug=payload.slug,
        title=payload.title,
        category=payload.category.value,
        summary=payload.summary,
        content=payload.content,
        impacts=[impact.model_dump(mode="json") for impact in payload.impacts]
        if payload.impacts is not None
        else None,
        published=payload.published,
        created_at=now,
        updated_at=now,
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    return to_post_out(post)


@router.put("/{post_id}", response_model=PostOut, dependencies=[Depends(require_admin)])
def update_post(
    post_id: int, payload: PostUpdate, session: Annotated[Session, Depends(get_session)]
) -> PostOut:
    post = session.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    changes = payload.model_dump(exclude_unset=True, mode="json")
    if "slug" in changes and changes["slug"] != post.slug:
        duplicate = session.scalars(select(Post).where(Post.slug == changes["slug"])).first()
        if duplicate is not None:
            raise HTTPException(status_code=409, detail="Ya existe un post con ese slug")
    for field, value in changes.items():
        if field == "category":
            post.category = PostCategory(value).value
        else:
            setattr(post, field, value)
    post.updated_at = datetime.now(UTC)
    session.commit()
    session.refresh(post)
    return to_post_out(post)


@router.delete("/{post_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_post(post_id: int, session: Annotated[Session, Depends(get_session)]) -> None:
    post = session.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    session.delete(post)
    session.commit()
