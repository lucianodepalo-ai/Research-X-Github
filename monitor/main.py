"""
Research-X Monitor — daemon Python 24/7.
Monitorea Twitter/X y el blog de Anthropic, notifica por Telegram en tiempo real.

Arrancar con PM2:
    pm2 start ecosystem.config.js --only research-x-monitor

O directamente:
    cd /home/claude-user/Research-X-Github-1/monitor && python main.py
"""
import asyncio
import logging
import os
import random
import sys
from pathlib import Path

from dotenv import load_dotenv

# Cargar .env del directorio monitor/
load_dotenv(Path(__file__).parent / ".env")

# Agregar raíz del proyecto al path para imports relativos
sys.path.insert(0, str(Path(__file__).parent.parent))

from monitor.notify.telegram import send_monitor_started
from monitor.sources.anthropic import check_anthropic_blog
from monitor.sources.twitter import discover_accounts, monitor_accounts
from monitor.sources.twitter_rss import check_twitter_rss
from monitor.sources.hackernews import check_hackernews
from monitor.sources.devto import check_devto

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("research-x-monitor")

# Intervalos en segundos
TWITTER_MONITOR_INTERVAL = 45 * 60        # 45 minutos
TWITTER_RSS_INTERVAL = 6 * 60 * 60        # 6 horas
TWITTER_DISCOVERY_INTERVAL = 30 * 60      # 30 minutos
ANTHROPIC_BLOG_INTERVAL = 2 * 60 * 60     # 2 horas
HACKERNEWS_INTERVAL = 2 * 60 * 60         # 2 horas
DEVTO_INTERVAL = 3 * 60 * 60              # 3 horas
DISCOVERY_JITTER = 3 * 60                 # ±3 minutos de jitter


async def hackernews_loop() -> None:
    """Loop de Hacker News vía Algolia + top stories. Corre cada 2 horas."""
    logger.info("Hacker News loop iniciado")
    await asyncio.sleep(10 * 60)  # Delay inicial de 10 min para no saturar al arrancar
    while True:
        try:
            count = await check_hackernews()
            logger.info("HN: %d posts nuevos", count)
        except Exception as e:
            logger.error("Error en hackernews_loop: %s", e, exc_info=True)
        await asyncio.sleep(HACKERNEWS_INTERVAL)


async def devto_loop() -> None:
    """Loop de Dev.to RSS. Corre cada 3 horas."""
    logger.info("Dev.to loop iniciado")
    await asyncio.sleep(20 * 60)  # Delay inicial de 20 min
    while True:
        try:
            count = await check_devto()
            logger.info("Dev.to: %d artículos nuevos", count)
        except Exception as e:
            logger.error("Error en devto_loop: %s", e, exc_info=True)
        await asyncio.sleep(DEVTO_INTERVAL)


async def twitter_monitor_loop() -> None:
    """Loop de monitoreo de cuentas Twitter. Corre cada 45 min."""
    logger.info("Twitter monitor loop iniciado")
    while True:
        try:
            count = await monitor_accounts()
            logger.info("Twitter monitor: %d tweets procesados", count)
        except Exception as e:
            logger.error("Error en twitter_monitor_loop: %s", e, exc_info=True)
        await asyncio.sleep(TWITTER_MONITOR_INTERVAL)


async def twitter_rss_loop() -> None:
    """Loop de Twitter vía RSS (rss.app + FetchRSS). Corre cada 6 horas."""
    logger.info("Twitter RSS loop iniciado")
    while True:
        try:
            count = await check_twitter_rss()
            logger.info("Twitter RSS: %d tweets procesados", count)
        except Exception as e:
            logger.error("Error en twitter_rss_loop: %s", e, exc_info=True)
        await asyncio.sleep(TWITTER_RSS_INTERVAL)


async def twitter_discovery_loop() -> None:
    """Loop de descubrimiento de cuentas nuevas. Corre cada ~30 min con jitter."""
    logger.info("Twitter discovery loop iniciado")
    # Delay inicial para no solapar con el monitor al arrancar
    await asyncio.sleep(15 * 60)
    while True:
        try:
            count = await discover_accounts()
            logger.info("Twitter discovery: %d sugerencias enviadas", count)
        except Exception as e:
            logger.error("Error en twitter_discovery_loop: %s", e, exc_info=True)
        jitter = random.uniform(-DISCOVERY_JITTER, DISCOVERY_JITTER)
        await asyncio.sleep(TWITTER_DISCOVERY_INTERVAL + jitter)


async def anthropic_blog_loop() -> None:
    """Loop del blog de Anthropic. Corre cada 2 horas."""
    logger.info("Anthropic blog loop iniciado")
    while True:
        try:
            count = await check_anthropic_blog()
            logger.info("Anthropic blog: %d posts nuevos", count)
        except Exception as e:
            logger.error("Error en anthropic_blog_loop: %s", e, exc_info=True)
        await asyncio.sleep(ANTHROPIC_BLOG_INTERVAL)


async def main() -> None:
    logger.info("=== Research-X Monitor arrancando ===")

    # Verificar variables de entorno críticas
    missing = [v for v in ("TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID") if not os.getenv(v)]
    if missing:
        logger.error("Variables de entorno faltantes: %s", ", ".join(missing))
        logger.error("Revisá monitor/.env")
        sys.exit(1)

    await send_monitor_started()

    # Correr todos los loops en paralelo
    await asyncio.gather(
        twitter_monitor_loop(),
        twitter_rss_loop(),
        twitter_discovery_loop(),
        anthropic_blog_loop(),
        hackernews_loop(),
        devto_loop(),
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Monitor detenido por el usuario")
