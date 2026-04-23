"""
Notificaciones Telegram para el monitor 24/7.
"""
import logging
import os

import httpx

logger = logging.getLogger(__name__)

TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"
MAX_DAILY_TWITTER = 5


def _escape(text: str) -> str:
    """Escapa caracteres especiales de MarkdownV2."""
    for ch in r"\_*[]()~`>#+-=|{}.!":
        text = text.replace(ch, f"\\{ch}")
    return text


async def _send(text: str) -> bool:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")
    if not token or not chat_id:
        logger.error("[telegram] TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados")
        return False

    url = TELEGRAM_API.format(token=token)
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "MarkdownV2",
        "disable_web_page_preview": True,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json=payload)
            if not resp.is_success:
                logger.error("[telegram] Error HTTP %s: %s", resp.status_code, resp.text[:200])
                return False
        return True
    except Exception as e:
        logger.error("[telegram] Excepción enviando mensaje: %s", e)
        return False


async def send_tweet_notification(
    account: str, score: int, summary: str, url: str, use_case: str = ""
) -> bool:
    """
    🐦 @account · score/10
    summary
    🔗 url
    💡 use_case  (opcional)
    """
    lines = [
        f"🐦 *@{_escape(account)}* · {score}/10",
        _escape(summary),
        f"🔗 {_escape(url)}",
    ]
    if use_case:
        lines.append(f"💡 {_escape(use_case)}")
    return await _send("\n".join(lines))


async def send_blog_notification(title: str, url: str, summary: str) -> bool:
    """
    📢 Anthropic — Título
    URL
    💡 summary
    """
    text = (
        f"📢 *Anthropic — {_escape(title)}*\n"
        f"{_escape(url)}\n"
        f"💡 {_escape(summary)}"
    )
    return await _send(text)


async def send_account_suggestion(
    handle: str, followers: int, bio: str, reason: str
) -> bool:
    """
    🔍 Cuenta sugerida: @handle (Xk followers)
    "bio"
    Motivo: ...
    Respondé /si o /no en las próximas 24hs
    """
    followers_str = f"{followers // 1000}k" if followers >= 1000 else str(followers)
    text = (
        f"🔍 *Cuenta sugerida:* @{_escape(handle)} \\({followers_str} followers\\)\n"
        f'"{_escape(bio[:100])}"\n'
        f"Motivo: {_escape(reason)}\n"
        f"Respondé /si o /no en las próximas 24hs"
    )
    return await _send(text)


async def send_session_expired_warning() -> bool:
    text = (
        "⚠️ *Monitor Twitter pausado — sesión expirada*\n"
        "Ejecutá: `python monitor/setup\\_twitter\\.py`\n"
        "y reiniciá: `pm2 restart research\\-x\\-monitor`"
    )
    return await _send(text)


async def send_monitor_started() -> bool:
    return await _send("✅ *Research\\-X Monitor* iniciado y corriendo 24/7")
