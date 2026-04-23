"""
Fuente: Twitter/X vía RSS (rss.app + FetchRSS).
Consume feeds RSS que servicios de terceros generan de cuentas de Twitter.
Sin acceso directo a x.com — 100% gratuito.

Setup requerido (una vez, en el browser del usuario):
  Ver TWITTER_RSS_SETUP.md
"""
import hashlib
import logging
from datetime import datetime, timezone

import feedparser
import httpx

from monitor.analyze.evaluator import evaluate_tweet, has_keyword
from monitor.notify.telegram import send_tweet_notification
from monitor.state.db import (
    count_notified_today,
    mark_tweet_notified,
    save_tweet,
    tweet_exists,
)

logger = logging.getLogger(__name__)

MAX_DAILY_NOTIFICATIONS = 5

# ─── Configuración de feeds RSS ────────────────────────────────────────────────
# Después de crear los feeds en rss.app y FetchRSS, pegar las URLs acá.
# Formato: { "handle": "URL_del_feed_RSS" }
#
# Para agregar: python monitor/add_twitter_feed.py @handle URL
TWITTER_RSS_FEEDS: dict[str, str] = {
    # rss.app (hasta 3 feeds gratuitos) — URLs generadas en rss.app
    # "ClaudeDevs": "https://rss.app/feeds/xxxxx.xml",
    # "claudeai":   "https://rss.app/feeds/yyyyy.xml",
    # "LunarResearcher": "https://rss.app/feeds/zzzzz.xml",

    # FetchRSS (hasta 5 feeds gratuitos) — URLs generadas en fetchrss.com
    # "ErickSky":    "https://fetchrss.com/rss/xxxxx.xml",
    # "franpradasAI": "https://fetchrss.com/rss/yyyyy.xml",
    # "_guillecasaus": "https://fetchrss.com/rss/zzzzz.xml",
    # "GitHub_Daily": "https://fetchrss.com/rss/aaaaa.xml",
    # "GitHubCommunity": "https://fetchrss.com/rss/bbbbb.xml",
}


def _entry_id(feed_url: str, entry) -> str:
    raw = getattr(entry, "id", None) or entry.get("link", "") or entry.get("title", "")
    return hashlib.sha1(f"{feed_url}:{raw}".encode()).hexdigest()


def _entry_date(entry) -> str:
    for field in ("published_parsed", "updated_parsed"):
        val = getattr(entry, field, None)
        if val:
            return datetime(*val[:6], tzinfo=timezone.utc).isoformat()
    return datetime.now(timezone.utc).isoformat()


def _entry_text(entry) -> str:
    return (
        getattr(entry, "title", "")
        or getattr(entry, "summary", "")
        or ""
    ).strip()


async def check_twitter_rss() -> int:
    """
    Revisa todos los feeds RSS de Twitter configurados.
    Retorna cantidad de tweets procesados.
    """
    if not TWITTER_RSS_FEEDS:
        logger.debug("[twitter_rss] Sin feeds configurados aún")
        return 0

    daily_count = count_notified_today()
    processed = 0

    for handle, feed_url in TWITTER_RSS_FEEDS.items():
        try:
            async with httpx.AsyncClient(timeout=12) as client:
                r = await client.get(feed_url, headers={"User-Agent": "Mozilla/5.0"})
                if r.status_code != 200:
                    logger.warning("[twitter_rss] @%s: HTTP %s", handle, r.status_code)
                    continue
                feed_content = r.text
        except Exception as e:
            logger.warning("[twitter_rss] @%s: error fetching feed: %s", handle, e)
            continue

        feed = feedparser.parse(feed_content)
        logger.info("[twitter_rss] @%s: %d entradas en feed", handle, len(feed.entries))

        for entry in feed.entries[:10]:  # Máx 10 por feed por ciclo
            tweet_id = _entry_id(feed_url, entry)
            if tweet_exists(tweet_id):
                continue

            text = _entry_text(entry)
            if not text or not has_keyword(text):
                continue

            result = await evaluate_tweet(account=handle, content=text)
            score = result.get("score", 0)
            summary = result.get("summary", "")
            url = entry.get("link", "")
            published_at = _entry_date(entry)

            should_notify = score >= 8 and daily_count < MAX_DAILY_NOTIFICATIONS

            save_tweet(
                tweet_id=tweet_id,
                account=handle,
                content=text,
                url=url,
                published_at=published_at,
                score=score,
                summary=summary,
                notified=should_notify,
                source="rss",
            )

            if should_notify:
                await send_tweet_notification(
                    account=handle, score=score, summary=summary, url=url
                )
                mark_tweet_notified(tweet_id)
                daily_count += 1
                logger.info("[twitter_rss] Notificado @%s score=%d", handle, score)

            processed += 1

    return processed


def add_feed(handle: str, url: str) -> None:
    """Agrega un feed al dict en runtime (para uso desde CLI)."""
    TWITTER_RSS_FEEDS[handle.lstrip("@")] = url
    logger.info("[twitter_rss] Feed agregado: @%s → %s", handle, url)
