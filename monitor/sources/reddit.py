"""
Fuente: Reddit — API JSON pública, sin autenticación, sin restricciones.
Monitorea subreddits relevantes filtrando por keywords y upvotes.
"""
import hashlib
import logging
from datetime import datetime, timezone

import httpx

from monitor.analyze.evaluator import has_keyword, _pts_to_score, _count_points
from monitor.notify.telegram import _send
from monitor.state.db import blog_post_exists, save_blog_post

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "ResearchXBot/1.0 (personal research bot)",
    "Accept": "application/json",
}

# Subreddits monitoreados con umbral mínimo de upvotes
SUBREDDITS = [
    ("ClaudeAI",         "new",  10),   # posts nuevos, umbral bajo (comunidad chica)
    ("LocalLLaMA",       "hot",  80),   # hot posts con tracción real
    ("MachineLearning",  "hot", 200),   # solo los más votados
    ("artificial",       "hot",  60),
    ("ChatGPT",          "hot", 150),   # para comparar tendencias
    ("programming",      "hot", 500),   # solo si hablan de IA/Claude
]

REDDIT_KEYWORDS = {
    "claude", "claude code", "anthropic", "mcp", "model context protocol",
    "claude agent", "llm", "ai agent", "cursor ai", "windsurf",
    "claude opus", "claude sonnet", "prompt caching",
}


def _post_id(subreddit: str, post_id: str) -> str:
    return hashlib.sha1(f"reddit:{subreddit}:{post_id}".encode()).hexdigest()


def _has_relevant_content(title: str, selftext: str = "") -> bool:
    combined = (title + " " + selftext).lower()
    return any(kw in combined for kw in REDDIT_KEYWORDS)


def _score_post(title: str, selftext: str, upvotes: int) -> int:
    text = f"{title} {selftext}"
    pts = _count_points(text)
    # Bonus por upvotes: señal de calidad de la comunidad
    if upvotes > 500:
        pts += 3
    elif upvotes > 200:
        pts += 2
    elif upvotes > 100:
        pts += 1
    return _pts_to_score(pts)


async def _send_reddit_notification(title: str, url: str, subreddit: str,
                                     upvotes: int, score: int) -> bool:
    from monitor.notify.telegram import _escape
    text = (
        f"🟠 *r/{_escape(subreddit)}* · {upvotes} upvotes · {score}/10\n"
        f"{_escape(title)}\n"
        f"🔗 {_escape(url)}"
    )
    return await _send(text)


async def check_reddit() -> int:
    """Revisa subreddits relevantes. Retorna cantidad de posts nuevos procesados."""
    new_count = 0

    async with httpx.AsyncClient(timeout=15, headers=HEADERS, follow_redirects=True) as client:
        for subreddit, sort, min_upvotes in SUBREDDITS:
            url = f"https://www.reddit.com/r/{subreddit}/{sort}.json?limit=25"
            try:
                r = await client.get(url)
                if r.status_code != 200:
                    logger.warning("[reddit] r/%s: HTTP %s", subreddit, r.status_code)
                    continue
                data = r.json()
            except Exception as e:
                logger.warning("[reddit] r/%s: %s", subreddit, e)
                continue

            posts = data.get("data", {}).get("children", [])
            logger.info("[reddit] r/%s: %d posts", subreddit, len(posts))

            for post in posts:
                p = post.get("data", {})
                post_id = _post_id(subreddit, p.get("id", ""))
                upvotes = p.get("ups", 0)
                title = p.get("title", "")
                selftext = p.get("selftext", "")[:500]
                permalink = f"https://reddit.com{p.get('permalink', '')}"
                created = p.get("created_utc", 0)
                published_at = datetime.fromtimestamp(created, tz=timezone.utc).isoformat()

                if blog_post_exists(post_id):
                    continue
                if upvotes < min_upvotes:
                    continue
                if not _has_relevant_content(title, selftext):
                    continue

                score = _score_post(title, selftext, upvotes)

                save_blog_post(
                    post_id=post_id,
                    title=f"[r/{subreddit}] {title}",
                    url=permalink,
                    summary=selftext[:300] if selftext else title,
                    published_at=published_at,
                    source="reddit",
                    notified=score >= 7,
                )

                if score >= 7:
                    await _send_reddit_notification(
                        title=title, url=permalink,
                        subreddit=subreddit, upvotes=upvotes, score=score,
                    )
                    logger.info("[reddit] r/%s notificado: '%s' (%d ups)", subreddit, title[:50], upvotes)

                new_count += 1

    logger.info("[reddit] %d posts nuevos procesados", new_count)
    return new_count
