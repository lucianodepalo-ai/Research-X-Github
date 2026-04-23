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
# Sin filtro de fecha — deduplicación en DB evita duplicados
# Ordenado por stars DESC para capturar repos relevantes y nuevos primero
LIVE_QUERIES = [
    # (término, stars_min)
    ("claude-code",              3),
    ("mcp-server",               3),
    ("claude agent",             5),
    ("model-context-protocol",   3),
    ("anthropic sdk",            5),
    ("claude desktop extension", 3),
    ("computer-use anthropic",   3),
    ("claude hooks",             3),
    ("claude skills",            3),
    ("mcp claude",               3),
]


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
    Busca repos en GitHub con queries Tier 1.
    Sin filtro de fecha — la DB deduplica. Retorna repos nuevos descubiertos.
    Sin GITHUB_TOKEN: 10 req/min (suficiente para ciclos de 2h).
    """
    from monitor.state.db import conn as get_conn
    import asyncio
    db = get_conn()

    headers = _get_headers()
    has_token = bool(os.getenv("GITHUB_TOKEN", ""))
    new_count = 0
    log_event("github_live", f"Iniciando búsqueda GitHub {'(autenticado)' if has_token else '(sin token)'}", "info")

    async with httpx.AsyncClient(timeout=15, headers=headers) as client:
        for i, (term, stars_min) in enumerate(LIVE_QUERIES):
            q = f"{term} stars:>{stars_min} sort:updated"

            try:
                r = await client.get(
                    GITHUB_API,
                    params={"q": q, "sort": "updated", "order": "desc", "per_page": 30},
                )

                if r.status_code == 403:
                    remaining = r.headers.get("x-ratelimit-remaining", "?")
                    log_event("github_live", f"Rate limit alcanzado (remaining={remaining}) — agregá GITHUB_TOKEN al .env", "warn")
                    logger.warning("[github_live] Rate limit alcanzado. Sin token: 10 req/min. Con token: 5000 req/h")
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

                logger.info("[github_live] '%s': %d en API, %d nuevos", term, len(items), term_new)
                if term_new > 0:
                    log_event(
                        "github_live",
                        f"'{term}': {term_new} repos nuevos",
                        "success",
                        f"{len(items)} encontrados en API",
                    )

                # Rate limit: sin token = 10 req/min → delay entre queries
                if not has_token and i < len(LIVE_QUERIES) - 1:
                    await asyncio.sleep(6)

            except Exception as e:
                logger.error("[github_live] Error en query '%s': %s", term, e)
                log_event("github_live", f"Error en '{term}': {e}", "error")

    log_event(
        "github_live",
        f"Búsqueda completada: {new_count} repos nuevos",
        "success" if new_count > 0 else "info",
    )
    logger.info("[github_live] %d repos nuevos en total", new_count)
    return new_count
