"""
Fuente: Twitter/X via twikit.
Monitorea cuentas específicas y detecta tweets relevantes sobre Claude/AI.
"""
import asyncio
import logging
import os
import random
from datetime import datetime, timezone
from pathlib import Path

from monitor.analyze.evaluator import evaluate_tweet, has_keyword
from monitor.notify.telegram import (
    send_account_suggestion,
    send_session_expired_warning,
    send_tweet_notification,
)
from monitor.state.db import (
    count_notified_today,
    get_active_accounts,
    mark_tweet_notified,
    save_tweet,
    tweet_exists,
    update_account_checked,
    upsert_account,
)

logger = logging.getLogger(__name__)

SESSION_FILE = Path(__file__).parent.parent / ".twitter_session.json"
MAX_DAILY_NOTIFICATIONS = 5

DISCOVERY_MIN_FOLLOWERS = 10_000
DISCOVERY_MIN_RECENT_POSTS = 5
DISCOVERY_KEYWORDS = {"claude", "anthropic", "mcp", "ai agent", "llm", "claude code"}

_client = None
_session_valid = True


async def _get_client():
    global _client, _session_valid
    if _client is not None:
        return _client

    try:
        from twikit import Client
    except ImportError:
        logger.error("[twitter] twikit no instalado. Ejecutá: pip install twikit")
        return None

    if not SESSION_FILE.exists():
        logger.error("[twitter] Sesión no encontrada. Ejecutá: python monitor/setup_twitter.py")
        _session_valid = False
        return None

    try:
        client = Client("es-AR")
        client.load_cookies(str(SESSION_FILE))
        _client = client
        _session_valid = True
        logger.info("[twitter] Sesión cargada correctamente")
        return client
    except Exception as e:
        logger.error("[twitter] Error cargando sesión: %s", e)
        _session_valid = False
        return None


def _tweet_url(handle: str, tweet_id: str) -> str:
    return f"https://x.com/{handle}/status/{tweet_id}"


def _tweet_published_at(tweet) -> str:
    try:
        # twikit devuelve created_at como string ISO o timestamp
        raw = getattr(tweet, "created_at", None) or getattr(tweet, "created_at_datetime", None)
        if isinstance(raw, datetime):
            return raw.replace(tzinfo=timezone.utc).isoformat()
        if raw:
            return str(raw)
    except Exception:
        pass
    return datetime.now(timezone.utc).isoformat()


async def _is_discoverable_account(user) -> tuple[bool, str]:
    """
    Evalúa si una cuenta desconocida merece ser sugerida para monitoreo.
    Retorna (bool, reason).
    """
    try:
        followers = getattr(user, "followers_count", 0) or 0
        if followers < DISCOVERY_MIN_FOLLOWERS:
            return False, ""

        bio = getattr(user, "description", "") or ""
        bio_lower = bio.lower()
        if not any(kw in bio_lower for kw in DISCOVERY_KEYWORDS):
            return False, ""

        # Verificar posts recientes sobre el tema
        recent_tweets = await user.get_tweets("Tweets", count=20)
        relevant_count = sum(
            1 for t in recent_tweets
            if has_keyword(getattr(t, "text", "") or "")
        )

        if relevant_count < DISCOVERY_MIN_RECENT_POSTS:
            return False, ""

        reason = f"{relevant_count} posts sobre Claude/AI en posts recientes"
        return True, reason
    except Exception as e:
        logger.debug("[twitter] Error evaluando cuenta para descubrimiento: %s", e)
        return False, ""


async def monitor_accounts() -> int:
    """
    Ciclo de monitoreo de cuentas seguidas (cada 45 min).
    Retorna cantidad de tweets procesados.
    """
    global _session_valid

    client = await _get_client()
    if client is None:
        if not _session_valid:
            await send_session_expired_warning()
        return 0

    accounts = get_active_accounts()
    if not accounts:
        logger.warning("[twitter] No hay cuentas activas para monitorear")
        return 0

    daily_count = count_notified_today()
    processed = 0

    for account_row in accounts:
        handle = account_row["handle"]
        # Jitter entre cuentas para evitar patrones detectables
        await asyncio.sleep(random.uniform(3, 8))

        try:
            user = await client.get_user_by_screen_name(handle)
            tweets = await user.get_tweets("Tweets", count=10)
        except Exception as e:
            err_str = str(e).lower()
            if "cookie" in err_str or "auth" in err_str or "unauthorized" in err_str:
                logger.error("[twitter] Sesión expirada: %s", e)
                _session_valid = False
                _client = None
                await send_session_expired_warning()
                return processed
            logger.warning("[twitter] Error fetching @%s: %s", handle, e)
            continue

        for tweet in tweets:
            tweet_id = str(getattr(tweet, "id", "") or "")
            if not tweet_id or tweet_exists(tweet_id):
                continue

            text = getattr(tweet, "text", "") or ""

            # Filtro 1: keywords obligatorias
            if not has_keyword(text):
                continue

            # Filtro 2: evaluación Claude Haiku
            result = await evaluate_tweet(account=handle, content=text)
            score = result.get("score", 0)
            summary = result.get("summary", "")

            url = _tweet_url(handle, tweet_id)
            published_at = _tweet_published_at(tweet)

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
            )

            if should_notify:
                await send_tweet_notification(
                    account=handle,
                    score=score,
                    summary=summary,
                    url=url,
                )
                mark_tweet_notified(tweet_id)
                daily_count += 1
                logger.info("[twitter] Notificado tweet de @%s (score %d)", handle, score)

            processed += 1

        update_account_checked(handle)

    logger.info("[twitter] Monitoreo completado: %d tweets procesados", processed)
    return processed


async def discover_accounts() -> int:
    """
    Ciclo de descubrimiento de cuentas nuevas (cada 30 min ± jitter).
    Analiza a quién mencionan/retuitean las cuentas monitoreadas.
    Retorna cantidad de sugerencias enviadas.
    """
    global _session_valid

    client = await _get_client()
    if client is None:
        return 0

    accounts = get_active_accounts()
    known_handles = {row["handle"].lower() for row in accounts}
    suggested = 0

    for account_row in accounts:
        handle = account_row["handle"]
        await asyncio.sleep(random.uniform(2, 6))

        try:
            user = await client.get_user_by_screen_name(handle)
            tweets = await user.get_tweets("Tweets", count=20)
        except Exception as e:
            logger.warning("[twitter] Discover: error fetching @%s: %s", handle, e)
            continue

        for tweet in tweets:
            # Buscar menciones y RTs
            mentioned = []
            text = getattr(tweet, "text", "") or ""

            # Usuarios mencionados en el tweet
            entities = getattr(tweet, "entities", {}) or {}
            for mention in entities.get("user_mentions", []):
                mhandle = mention.get("screen_name", "")
                if mhandle and mhandle.lower() not in known_handles:
                    mentioned.append(mhandle)

            for mhandle in set(mentioned[:3]):  # Máx 3 por tweet
                await asyncio.sleep(random.uniform(2, 5))
                try:
                    muser = await client.get_user_by_screen_name(mhandle)
                    is_good, reason = await _is_discoverable_account(muser)
                    if is_good:
                        bio = getattr(muser, "description", "") or ""
                        followers = getattr(muser, "followers_count", 0) or 0
                        await send_account_suggestion(
                            handle=mhandle,
                            followers=followers,
                            bio=bio,
                            reason=reason,
                        )
                        # Marcar como "pendiente" para no re-sugerir
                        known_handles.add(mhandle.lower())
                        suggested += 1
                except Exception:
                    pass

    logger.info("[twitter] Descubrimiento: %d sugerencias enviadas", suggested)
    return suggested
