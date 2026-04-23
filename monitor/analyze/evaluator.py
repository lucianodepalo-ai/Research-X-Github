"""
Evaluador sin API: scoring por keywords ponderados + señales estructurales.
100% gratuito, determinístico, sin latencia.
"""
import re

# ── Tablas de keywords ────────────────────────────────────────────────────────

# Tier 3: muy específicos → alto valor garantizado
KEYWORDS_HIGH = [
    "claude code", "claude agent", "mcp server", "mcp tool",
    "model context protocol", "anthropic api", "claude api",
    "claude opus", "claude sonnet", "claude haiku",
    "claude 3", "claude 4", "claude.md", "claude desktop",
    "computer use", "extended thinking", "prompt caching",
]

# Tier 2: relevantes para el perfil
KEYWORDS_MID = [
    "claude", "anthropic", "mcp", "llm agent", "ai agent",
    "cursor", "windsurf", "codeium", "copilot alternative",
    "context window", "tool use", "function calling",
    "langchain", "llamaindex", "autogen", "crewai",
]

# Tier 1: señales de contexto
KEYWORDS_LOW = [
    "open source", "github", "workflow", "automation",
    "developer tool", "devtool", "plugin", "integration",
    "tutorial", "how to", "tips", "tricks", "best practice",
]

GITHUB_URL_RE = re.compile(r"github\.com/[\w\-]+/[\w\-]+", re.IGNORECASE)
CODE_RE = re.compile(r"```|`[^`]+`", re.DOTALL)

# ── Scorer principal ──────────────────────────────────────────────────────────

def _count_points(text: str) -> int:
    lower = text.lower()
    pts = 0
    for kw in KEYWORDS_HIGH:
        if kw in lower:
            pts += 3
    for kw in KEYWORDS_MID:
        if kw in lower:
            pts += 2
    for kw in KEYWORDS_LOW:
        if kw in lower:
            pts += 1
    if GITHUB_URL_RE.search(text):
        pts += 2
    if CODE_RE.search(text):
        pts += 1
    return pts


def _pts_to_score(pts: int) -> int:
    if pts >= 10:
        return 10
    if pts >= 8:
        return 9
    if pts >= 6:
        return 8
    if pts >= 5:
        return 7
    if pts >= 4:
        return 6
    if pts >= 3:
        return 5
    if pts >= 2:
        return 4
    if pts >= 1:
        return 2
    return 1


def _make_summary(account: str, text: str, score: int) -> str:
    """Resumen limpio del tweet para mostrar en dashboard/Telegram."""
    clean = text.replace("\n", " ").strip()
    if len(clean) <= 200:
        return clean
    return clean[:197] + "..."


# ── API pública ───────────────────────────────────────────────────────────────

def has_keyword(text: str) -> bool:
    """Filtro rápido previo: descarta textos sin ninguna keyword relevante."""
    lower = text.lower()
    return any(kw in lower for kw in [*KEYWORDS_HIGH, *KEYWORDS_MID])


async def evaluate_tweet(account: str, content: str) -> dict:
    """
    Evalúa un tweet con scoring por keywords.
    Interfaz async mantenida para compatibilidad con twitter.py.
    Retorna dict con 'score' (int 1-10) y 'summary' (str).
    """
    pts = _count_points(content)
    score = _pts_to_score(pts)
    summary = _make_summary(account, content, score)
    return {"score": score, "summary": summary}


async def summarize_blog_post(title: str, url: str, rss_summary: str = "") -> str:
    """
    Retorna el resumen del post. Usa el summary del RSS si está disponible,
    sino construye uno básico con el título.
    """
    if rss_summary and len(rss_summary.strip()) > 20:
        clean = re.sub(r"<[^>]+>", "", rss_summary).strip()
        return clean[:400] if len(clean) > 400 else clean
    return f"Nuevo post de Anthropic: {title}"
