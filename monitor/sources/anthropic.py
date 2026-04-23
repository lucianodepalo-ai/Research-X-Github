"""
Fuente: Blog oficial de Anthropic.
Fetch RSS cada 2 horas, guarda posts nuevos y los notifica.
"""
import hashlib
import logging
from datetime import datetime, timezone

import feedparser

from monitor.analyze.evaluator import summarize_blog_post
from monitor.notify.telegram import send_blog_notification
from monitor.state.db import blog_post_exists, save_blog_post

logger = logging.getLogger(__name__)

RSS_URL = "https://www.anthropic.com/rss.xml"
FALLBACK_URL = "https://www.anthropic.com/news"


def _post_id(entry) -> str:
    """ID estable: usa el GUID del RSS, o un hash de la URL."""
    if hasattr(entry, "id") and entry.id:
        return entry.id
    return hashlib.sha1((entry.get("link") or entry.get("title") or "").encode()).hexdigest()


def _parse_date(entry) -> str:
    for field in ("published_parsed", "updated_parsed"):
        val = getattr(entry, field, None)
        if val:
            return datetime(*val[:6], tzinfo=timezone.utc).isoformat()
    return datetime.now(timezone.utc).isoformat()


async def check_anthropic_blog() -> int:
    """Revisa el blog de Anthropic, guarda y notifica posts nuevos. Retorna cantidad de nuevos."""
    logger.info("[anthropic] Revisando blog...")
    try:
        feed = feedparser.parse(RSS_URL)
        if feed.bozo and not feed.entries:
            logger.warning("[anthropic] RSS falló, sin entradas.")
            return 0
    except Exception as e:
        logger.error("[anthropic] Error parseando RSS: %s", e)
        return 0

    new_count = 0
    for entry in feed.entries:
        post_id = _post_id(entry)
        if blog_post_exists(post_id):
            continue

        title = entry.get("title", "Sin título")
        url = entry.get("link", "")
        published_at = _parse_date(entry)

        logger.info("[anthropic] Post nuevo: %s", title)

        # Resumir con Claude Haiku
        summary = await summarize_blog_post(title=title, url=url)

        save_blog_post(
            post_id=post_id,
            title=title,
            url=url,
            summary=summary,
            published_at=published_at,
            source="anthropic",
            notified=True,
        )

        await send_blog_notification(title=title, url=url, summary=summary)
        new_count += 1

    logger.info("[anthropic] %d posts nuevos procesados", new_count)
    return new_count
