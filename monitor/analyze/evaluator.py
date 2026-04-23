"""
Evaluador con Claude Haiku: scoring rápido y barato para tweets y blog posts.
"""
import json
import logging
import os

import anthropic

logger = logging.getLogger(__name__)

_client: anthropic.AsyncAnthropic | None = None

TWITTER_KEYWORDS = {
    "claude", "claude code", "mcp", "model context protocol",
    "anthropic", "llm", "ai agent", "cursor", "windsurf",
    "claude api", "claude sonnet", "claude opus", "haiku",
}

SYSTEM_PROMPT = """Sos asistente técnico para un dev full-stack argentino.

Perfil:
- Stack: Node.js, TypeScript, Next.js, React, PostgreSQL
- Usa Claude Code diariamente para desarrollo
- Construye MCP servers y agentes IA
- Proyecto principal: Wando (SaaS WhatsApp Business)
- Busca herramientas, técnicas y repos nuevos sobre Claude/Anthropic/MCP

Tu tarea: evaluar si el contenido es relevante y útil para este perfil.

Criterios de score:
- 8-10: información técnica nueva, anuncio importante, herramienta o técnica aplicable YA
- 5-7: interesante pero no urgente, referencia futura
- 1-4: ruido, autopromoción, irrelevante, genérico

Respondé ÚNICAMENTE con JSON válido. Sin markdown, sin explicaciones."""


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


def has_keyword(text: str) -> bool:
    """Filtro rápido: al menos una keyword relevante en el texto."""
    text_lower = text.lower()
    return any(kw in text_lower for kw in TWITTER_KEYWORDS)


async def evaluate_tweet(account: str, content: str) -> dict:
    """
    Evalúa un tweet con Claude Haiku.
    Retorna dict con 'score' (int) y 'summary' (str).
    """
    prompt = f"""Cuenta: @{account}
Tweet: {content}

Devolvé JSON: {{"score": <1-10>, "summary": "<una línea en español>"}}"""

    try:
        client = _get_client()
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=150,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        return json.loads(raw)
    except Exception as e:
        logger.error("[evaluator] Error evaluando tweet de @%s: %s", account, e)
        return {"score": 0, "summary": "Error en evaluación"}


async def summarize_blog_post(title: str, url: str) -> str:
    """
    Genera un resumen de un post del blog de Anthropic.
    Retorna string con el resumen en español.
    """
    prompt = f"""Post del blog de Anthropic:
Título: {title}
URL: {url}

Escribí UN párrafo corto en español explicando qué es esto y por qué importa para alguien que usa Claude Code y construye con la API de Anthropic."""

    try:
        client = _get_client()
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        logger.error("[evaluator] Error resumiendo blog post: %s", e)
        return f"Nuevo post de Anthropic: {title}"
