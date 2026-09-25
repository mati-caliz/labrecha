from __future__ import annotations

import html
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Any

import httpx
from defusedxml import ElementTree
from sqlalchemy.orm import Session

from labrecha_db import NewsArticle
from labrecha_scraper.base import Connector, upsert_rows

COUNTRY = "ARGENTINA"
MAX_ITEMS_PER_FEED = 40
SUMMARY_MAX_LENGTH = 1000
TITLE_MAX_LENGTH = 500
IMAGE_URL_MAX_LENGTH = 1000
SOURCE_URL_MAX_LENGTH = 2048

TAG_PATTERN = re.compile(r"<[^>]+>")
IMAGE_PATTERN = re.compile(r"<img[^>]+src=[\"']([^\"']+)[\"']", re.IGNORECASE)


@dataclass
class RssFeed:
    source: str
    url: str
    default_category: str


FEEDS: list[RssFeed] = [
    RssFeed("El Economista", "https://eleconomista.com.ar/feed/", "ECONOMY_GENERAL"),
]


def _strip_html(value: str | None) -> str:
    if value is None:
        return ""
    return html.unescape(TAG_PATTERN.sub("", value)).strip()


def _extract_image(description: str | None) -> str | None:
    if description is None:
        return None
    match = IMAGE_PATTERN.search(description)
    if match is None:
        return None
    return match.group(1)[:IMAGE_URL_MAX_LENGTH]


def _parse_date(raw: str | None) -> datetime:
    if raw:
        try:
            parsed = parsedate_to_datetime(raw)
        except (TypeError, ValueError):
            pass
        else:
            return (
                parsed.astimezone(UTC) if parsed.tzinfo is not None else parsed.replace(tzinfo=UTC)
            )
    return datetime.now(UTC)


class NewsConnector(Connector[list[dict[str, Any]]]):
    name = "news"
    source = "rss"

    def fetch(self) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        seen_urls: set[str] = set()
        with self.build_client() as client:
            for feed in FEEDS:
                for row in self._fetch_feed(client, feed):
                    if row["source_url"] in seen_urls:
                        continue
                    seen_urls.add(row["source_url"])
                    rows.append(row)
        return rows

    def persist(self, session: Session, data: list[dict[str, Any]]) -> int:
        return upsert_rows(session, NewsArticle, data, ["source_url"], update_on_conflict=False)

    def _fetch_feed(self, client: httpx.Client, feed: RssFeed) -> list[dict[str, Any]]:
        response = client.get(feed.url)
        response.raise_for_status()
        root = ElementTree.fromstring(response.content)

        now = datetime.now(UTC)
        rows: list[dict[str, Any]] = []
        for item in list(root.iter("item"))[:MAX_ITEMS_PER_FEED]:
            title = _strip_html(item.findtext("title"))
            source_url = (item.findtext("link") or "").strip()
            if not title or not source_url or len(source_url) > SOURCE_URL_MAX_LENGTH:
                continue
            description = item.findtext("description")
            content = _strip_html(description) or title
            rows.append(
                {
                    "title": title[:TITLE_MAX_LENGTH],
                    "content": content,
                    "summary": content[:SUMMARY_MAX_LENGTH],
                    "source": feed.source,
                    "source_url": source_url,
                    "country": COUNTRY,
                    "category": feed.default_category,
                    "published_date": _parse_date(item.findtext("pubDate")),
                    "image_url": _extract_image(description),
                    "is_official": False,
                    "created_at": now,
                    "updated_at": now,
                }
            )
        return rows
