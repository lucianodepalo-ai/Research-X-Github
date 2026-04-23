"""
Fuente: Hacker News — API Firebase pública, sin autenticación, sin restricciones.
Filtra stories y posts sobre Claude/Anthropic/MCP/AI agents.
"""
import logging
from datetime import datetime, timezone

import httpx

from monitor.analyze.evaluator import has_keyword, _count_points, _pts_to_score
from monitor.notify.telegram import _send
from monitor.state.db import blog_post_exists, save_blog_post, log_event

logger = logging.getLogger(__name__)

HN_API = "https://hacker-news.firebaseio.com/v0"
HN_ALGOLIA = "https://hn.algolia.com/api/v1/search"
HN_BASE = "https://news.ycombinator.com"
HEADERS = {"User-Agent": "ResearchXBot/1.0"}

HN_KEYWORDS = {
    "claude", "anthropic", "mcp", "model context protocol",
    "claude code", "claude agent", "llm agent", "ai agent",
    "claude opus", "claude sonnet", "cursor ai",
}

# Búsquedas específicas para Algolia (API de búsqueda de HN)
HN_SEARCH_QUERIES = [
    "claude code",
    "claude anthropic",
    "mcp server",
    "claude agent",
]

MIN_SCORE = 30   # HN points mínimos


async def _get_item(client: httpx.AsyncClient, item_id: int) -> dict | None:
    try:
        r = await client.get(f"{HN_API}/item/{item_id}.json")
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None


def _is_relevant(item: dict) -> bool:
    title = (item.get("title") or "").lower()
    url = (item.get("url") or "").lower()
    text = (item.get("text") or "").lower()
    combined = f"{title} {url} {text}"
    return any(kw in combined for kw in HN_KEYWORDS)


def _score_hn(item: dict) -> int:
    title = item.get("title", "")
    url = item.get("url", "")
    pts = _count_points(f"{title} {url}")
    hn_score = item.get("score", 0)
    if hn_score > 300:
        pts += 3
    elif hn_score > 150:
        pts += 2
    elif hn_score > 80:
        pts += 1
    return _pts_to_score(pts)


async def _send_hn_notification(title: str, url: str, hn_score: int, score: int) -> bool:
    from monitor.notify.telegram import _escape
    hn_url = url or f"{HN_BASE}"
    text = (
        f"🟡 *Hacker News* · {hn_score} pts · {score}/10\n"
        f"{_escape(title)}\n"
        f"🔗 {_escape(hn_url)}"
    )
    return await _send(text)


async def _algolia_search(client: httpx.AsyncClient) -> list[dict]:
    """Busca stories relevantes via Algolia (más preciso que browsing general)."""
    results = {}
    for query in HN_SEARCH_QUERIES:
        try:
            r = await client.get(
                HN_ALGOLIA,
                params={"query": query, "tags": "story", "hitsPerPage": 15,
                        "numericFilters": f"points>{MIN_SCORE}"}
            )
            if r.status_code == 200:
                for hit in r.json().get("hits", []):
                    oid = hit.get("objectID")
                    if oid and oid not in results:
                        results[oid] = {
                            "id": oid,
                            "title": hit.get("title", ""),
                            "url": hit.get("url") or f"{HN_BASE}/item?id={oid}",
                            "score": hit.get("points", 0),
                            "time": hit.get("created_at_i", 0),
                            "type": "story",
                        }
        except Exception as e:
            logger.warning("[hn] Algolia query '%s' falló: %s", query, e)
    return list(results.values())


async def check_hackernews() -> int:
    """Revisa HN vía Algolia (búsqueda precisa) + top stories. Retorna nuevos relevantes."""
    log_event("hackernews", "Revisando Hacker News", "info")
    new_count = 0

    async with httpx.AsyncClient(timeout=12, headers=HEADERS) as client:
        # Algolia: búsqueda directa sobre queries específicas
        algolia_items = await _algolia_search(client)

        # Top stories: rastreo general (captura lo que Algolia puede no indexar aún)
        ids_top = []
        try:
            r = await client.get(f"{HN_API}/topstories.json")
            ids_top = r.json()[:60] if r.status_code == 200 else []
        except Exception:
            pass

        # Fetch items de top stories
        top_items = []
        algolia_ids = {i["id"] for i in algolia_items}
        for item_id in ids_top[:60]:
            if str(item_id) in algolia_ids:
                continue
            item = await _get_item(client, item_id)
            if item and item.get("type") == "story" and item.get("score", 0) >= MIN_SCORE:
                top_items.append(item)

        all_items = algolia_items + [
            {"id": str(i["id"]), "title": i.get("title",""), "url": i.get("url") or f"{HN_BASE}/item?id={i['id']}",
             "score": i.get("score",0), "time": i.get("time",0), "type": "story"}
            for i in top_items if _is_relevant(i)
        ]

        logger.info("[hn] %d stories relevantes a procesar", len(all_items))

        for item_id in [i["id"] for i in all_items]:
            # Para items de Algolia ya tenemos los datos; para top_stories fetcheamos
            item_data = next((i for i in all_items if str(i["id"]) == str(item_id)), None)
            if not item_data:
                item_data = await _get_item(client, int(item_id))
                if not item_data:
                    continue
                item_data = {"id": str(item_data["id"]), "title": item_data.get("title",""),
                             "url": item_data.get("url") or f"{HN_BASE}/item?id={item_id}",
                             "score": item_data.get("score",0), "time": item_data.get("time",0)}

            post_id = f"hn:{item_id}"
            if blog_post_exists(post_id):
                continue

            title = item_data.get("title", "")
            url = item_data.get("url") or f"{HN_BASE}/item?id={item_id}"
            hn_score = item_data.get("score", 0)
            created = item_data.get("time", 0)
            published_at = datetime.fromtimestamp(created, tz=timezone.utc).isoformat()

            score = _score_hn(item)

            save_blog_post(
                post_id=post_id,
                title=f"[HN] {title}",
                url=url,
                summary=f"Hacker News · {hn_score} puntos",
                published_at=published_at,
                source="hackernews",
                notified=score >= 7,
                score=score,
            )

            if score >= 7:
                await _send_hn_notification(title=title, url=url,
                                             hn_score=hn_score, score=score)
                logger.info("[hn] Notificado: '%s' (%d pts)", title[:60], hn_score)

            new_count += 1

    logger.info("[hn] %d posts nuevos procesados", new_count)
    log_event(
        "hackernews",
        f"{new_count} posts nuevos · {len(all_items)} relevantes procesados",
        "success" if new_count > 0 else "info",
    )
    return new_count
