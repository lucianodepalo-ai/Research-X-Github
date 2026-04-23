"""
Fuente: Dev.to — RSS por tags, sin autenticación, sin restricciones regionales.
Artículos técnicos de la comunidad developer sobre Claude/Anthropic/MCP.
"""
import hashlib
import logging
import re
from datetime import datetime, timezone

import httpx
import feedparser

from monitor.analyze.evaluator import has_keyword, _count_points, _pts_to_score
from monitor.notify.telegram import _send
from monitor.state.db import blog_post_exists, save_blog_post, log_event

logger = logging.getLogger(__name__)

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; ResearchXBot/1.0)"}

DEVTO_TAGS = [
    "claudeai",
    "claude",
    "anthropic",
    "mcp",          # Model Context Protocol
    "claudecode",
]


def _post_id(url: str) -> str:
    return hashlib.sha1(f"devto:{url}".encode()).hexdigest()


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text).strip()


async def check_devto() -> int:
    """Revisa tags de Dev.to. Retorna cantidad de artículos nuevos."""
    log_event("devto", "Revisando Dev.to RSS", "info")
    new_count = 0
    seen_urls: set[str] = set()

    async with httpx.AsyncClient(timeout=15, headers=HEADERS) as client:
        for tag in DEVTO_TAGS:
            url = f"https://dev.to/feed/tag/{tag}"
            try:
                r = await client.get(url, follow_redirects=True)
                if r.status_code != 200:
                    logger.warning("[devto] tag=%s: HTTP %s", tag, r.status_code)
                    continue
            except Exception as e:
                logger.warning("[devto] tag=%s: %s", tag, e)
                continue

            feed = feedparser.parse(r.text)
            logger.info("[devto] tag=%s: %d artículos", tag, len(feed.entries))

            for entry in feed.entries:
                article_url = entry.get("link", "")
                if not article_url or article_url in seen_urls:
                    continue
                seen_urls.add(article_url)

                post_id = _post_id(article_url)
                if blog_post_exists(post_id):
                    continue

                title = entry.get("title", "")
                summary_raw = entry.get("summary", "")[:600]
                summary = _strip_html(summary_raw)

                # Filtrar por relevancia
                combined = f"{title} {summary}"
                if not has_keyword(combined):
                    continue

                pts = _count_points(combined)
                score = _pts_to_score(pts)

                # Solo guardamos artículos con score mínimo
                if score < 4:
                    continue

                published_at = datetime.now(timezone.utc).isoformat()
                if hasattr(entry, "published_parsed") and entry.published_parsed:
                    published_at = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()

                save_blog_post(
                    post_id=post_id,
                    title=f"[Dev.to] {title}",
                    url=article_url,
                    summary=summary[:300],
                    published_at=published_at,
                    source="devto",
                    notified=score >= 7,
                    score=score,
                )

                if score >= 7:
                    await _send_devto_notification(title=title, url=article_url, score=score)
                    logger.info("[devto] Notificado: '%s'", title[:60])

                new_count += 1

    logger.info("[devto] %d artículos nuevos procesados", new_count)
    log_event(
        "devto",
        f"{new_count} artículos nuevos de Dev.to",
        "success" if new_count > 0 else "info",
    )
    return new_count


async def _send_devto_notification(title: str, url: str, score: int) -> bool:
    from monitor.notify.telegram import _escape
    text = (
        f"📝 *Dev\\.to* · {score}/10\n"
        f"{_escape(title)}\n"
        f"🔗 {_escape(url)}"
    )
    return await _send(text)
