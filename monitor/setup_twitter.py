"""
Setup inicial de Twitter/X: autentica con twikit y guarda las cookies de sesión.
Ejecutar una sola vez (o cuando las cookies expiren):

    cd monitor && python setup_twitter.py
"""
import asyncio
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

SESSION_FILE = Path(__file__).parent / ".twitter_session.json"
INITIAL_ACCOUNTS = [
    "ClaudeDevs",
    "ErickSky",
    "hasantoxr",
    "barckcode",
    "techxutkarsh",
]


async def main() -> None:
    try:
        from twikit import Client
    except ImportError:
        print("ERROR: twikit no está instalado. Ejecutá: pip install twikit")
        sys.exit(1)

    username = os.getenv("TWITTER_USERNAME")
    password = os.getenv("TWITTER_PASSWORD")
    email = os.getenv("TWITTER_EMAIL")

    if not all([username, password, email]):
        print("ERROR: Faltan variables de entorno en monitor/.env:")
        print("  TWITTER_USERNAME, TWITTER_PASSWORD, TWITTER_EMAIL")
        sys.exit(1)

    print(f"Autenticando como @{username}...")
    client = Client("es-AR")

    try:
        await client.login(auth_info_1=username, auth_info_2=email, password=password)
    except Exception as e:
        print(f"ERROR al hacer login: {e}")
        sys.exit(1)

    client.save_cookies(str(SESSION_FILE))
    print(f"✓ Sesión guardada en {SESSION_FILE}")

    # Seed de cuentas iniciales en la DB
    try:
        sys.path.insert(0, str(Path(__file__).parent))
        from state.db import upsert_account
        for handle in INITIAL_ACCOUNTS:
            upsert_account(handle, source="manual")
            print(f"  ✓ @{handle} agregada al monitoreo")
    except Exception as e:
        print(f"WARN: No se pudieron seedear las cuentas en DB: {e}")
        print("  Podés agregarlas manualmente más tarde.")

    print("\n✓ Setup completo. Podés arrancar el monitor con:")
    print("  pm2 start ecosystem.config.js --only research-x-monitor")


if __name__ == "__main__":
    asyncio.run(main())
