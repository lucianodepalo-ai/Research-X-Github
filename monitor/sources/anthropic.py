"""
Fuente: Blog oficial de Anthropic.
Scraping de anthropic.com/news cada 2 horas — sin RSS, sin API.
"""
import hashlib
import logging
import re
from datetime import datetime, timezone

import httpx

from monitor.analyze.evaluator import summarize_blog_post
from monitor.notify.telegram import send_blog_notification
from monitor.state.db import blog_post_exists, save_blog_post

logger = logging.getLogger(__name__)

BASE_URL = "https://www.anthropic.com"
NEWS_URL = f"{BASE_URL}/news"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; ResearchBot/1.0)"}


def _post_id(slug: str) -> str:
    return hashlib.sha1(slug.encode()).hexdigest()


def _extract_slugs(html: str) -> list[str]:
    """Extrae slugs únicos de artículos /news/xxx del HTML."""
    raw = re.findall(r'href=\"(/news/[a-zA-Z0-9\-]+)\"', html)
    # Deduplicar manteniendo orden
    seen = set()
    result = []
    for slug in raw:
        if slug not in seen and slug != "/news":
            seen.add(slug)
            result.append(slug)
    return result


def _extract_title(html: str, slug: str) -> str:
    """Intenta extraer el título del <title> o <h1> del artículo."""
    m = re.search(r"<title[^>]*>([^<]+)</title>", html, re.IGNORECASE)
    if m:
        title = m.group(1).strip()
        # Anthropic pone "Título | Anthropic" — quedarse con la parte antes del pipe
        return title.split("|")[0].strip()
    m = re.search(r"<h1[^>]*>([^<]+)</h1>", html, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    # Fallback: convertir slug a título
    return slug.replace("/news/", "").replace("-", " ").title()


def _extract_description(html: str) -> str:
    """Extrae meta description del artículo."""
    m = re.search(
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']',
        html, re.IGNORECASE
    )
    if m:
        return m.group(1).strip()
    m = re.search(
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']description["\']',
        html, re.IGNORECASE
    )
    if m:
        return m.group(1).strip()
    return ""


async def check_anthropic_blog() -> int:
    """Revisa la página de noticias de Anthropic y notifica posts nuevos."""
    logger.info("[anthropic] Revisando anthropic.com/news...")

    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(NEWS_URL, headers=HEADERS)
            if r.status_code != 200:
                logger.warning("[anthropic] HTTP %s en /news", r.status_code)
                return 0
            slugs = _extract_slugs(r.text)
    except Exception as e:
        logger.error("[anthropic] Error fetching /news: %s", e)
        return 0

    logger.info("[anthropic] %d artículos encontrados en /news", len(slugs))

    new_count = 0
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        for slug in slugs[:15]:  # Máx 15 por ciclo
            post_id = _post_id(slug)
            if blog_post_exists(post_id):
                continue

            url = f"{BASE_URL}{slug}"
            try:
                r = await client.get(url, headers=HEADERS)
                article_html = r.text if r.status_code == 200 else ""
            except Exception:
                article_html = ""

            title = _extract_title(article_html, slug) if article_html else slug.replace("/news/", "").replace("-", " ").title()
            rss_summary = _extract_description(article_html) if article_html else ""
            published_at = datetime.now(timezone.utc).isoformat()

            logger.info("[anthropic] Post nuevo: %s", title)

            summary = await summarize_blog_post(
                title=title, url=url, rss_summary=rss_summary
            )

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
