"""
GitHub Live Discovery — búsqueda continua cada 2 horas.
Solo Tier 1 (queries más específicas de Claude/MCP) sin análisis de IA.
Los repos se guardan en seen_repos para que el bot Node.js los analice en su run diario.
El bot Node.js mantiene la exclusividad del análisis con Claude CLI.
"""
import logging
import os
from datetime import datetime, timezone

import httpx

from monitor.state.db import log_event, now_iso

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com/search/repositories"

# Tier 1 exclusivamente — señal alta, poco ruido, justifica búsqueda frecuente
LIVE_QUERIES = [
    ("claude-code",              3,  2),   # (término, stars_min, days)
    ("mcp-server",               3,  2),
    ("claude agent",             5,  3),
    ("model-context-protocol",   3,  2),
    ("anthropic sdk",            5,  3),
    ("claude desktop extension", 3,  5),
    ("computer-use anthropic",   3,  5),
    ("claude hooks",             3,  7),
    ("claude skills",            3,  7),
    ("mcp claude",               3,  3),
]


def _iso_days_ago(days: int) -> str:
    from datetime import timedelta
    d = datetime.now(timezone.utc) - timedelta(days=days)
    return d.strftime("%Y-%m-%d")


def _get_headers() -> dict:
    token = os.getenv("GITHUB_TOKEN", "")
    h = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ResearchXBot/1.0",
    }
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def _upsert_repo(db_conn, repo: dict) -> bool:
    """Inserta un repo en seen_repos si no existe. Retorna True si era nuevo."""
    existing = db_conn.execute(
        "SELECT id FROM seen_repos WHERE id = ?", (repo["id"],)
    ).fetchone()
    if existing:
        return False

    db_conn.execute(
        """INSERT INTO seen_repos
           (id, full_name, first_seen_at, html_url, description, stars, language, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'search')
           ON CONFLICT(id) DO NOTHING""",
        (
            repo["id"],
            repo["full_name"],
            now_iso(),
            repo["html_url"],
            (repo.get("description") or "")[:500],
            repo["stargazers_count"],
            repo.get("language"),
        ),
    )
    db_conn.commit()
    return True


async def check_github_live() -> int:
    """
    Busca repos nuevos en GitHub con queries Tier 1.
    Los guarda en seen_repos sin análisis.
    Retorna cantidad de repos nuevos descubiertos.
    """
    from monitor.state.db import conn as get_conn
    db = get_conn()

    headers = _get_headers()
    new_count = 0
    log_event("github_live", "Iniciando búsqueda live de GitHub", "info")

    async with httpx.AsyncClient(timeout=15, headers=headers) as client:
        for term, stars_min, days in LIVE_QUERIES:
            since = _iso_days_ago(days)
            q = f"{term} stars:>{stars_min} (created:>{since} OR pushed:>{since})"

            try:
                r = await client.get(
                    GITHUB_API,
                    params={"q": q, "sort": "updated", "order": "desc", "per_page": 30},
                )

                if r.status_code == 403:
                    remaining = r.headers.get("x-ratelimit-remaining", "?")
                    reset = r.headers.get("x-ratelimit-reset", "?")
                    log_event("github_live", f"Rate limit alcanzado (remaining={remaining})", "warn")
                    logger.warning("[github_live] Rate limit: %s", r.text[:100])
                    break

                if r.status_code != 200:
                    logger.warning("[github_live] HTTP %s para query '%s'", r.status_code, term)
                    continue

                items = r.json().get("items", [])
                term_new = 0
                for repo in items:
                    if _upsert_repo(db, repo):
                        term_new += 1
                        new_count += 1

                if term_new > 0:
                    log_event(
                        "github_live",
                        f"'{term}': {term_new} repos nuevos",
                        "info",
                        f"{len(items)} encontrados, {term_new} nuevos",
                    )
                    logger.info("[github_live] '%s': %d nuevos / %d encontrados", term, term_new, len(items))

            except Exception as e:
                logger.error("[github_live] Error en query '%s': %s", term, e)
                log_event("github_live", f"Error en '{term}': {e}", "error")

    log_event(
        "github_live",
        f"Búsqueda completada: {new_count} repos nuevos descubiertos",
        "success" if new_count > 0 else "info",
    )
    logger.info("[github_live] %d repos nuevos en total", new_count)
    return new_count
