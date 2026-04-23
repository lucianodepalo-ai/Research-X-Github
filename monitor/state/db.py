import sqlite3
import os
from pathlib import Path
from datetime import datetime, timezone

DB_PATH = Path(os.getenv("DB_PATH", str(Path(__file__).parent.parent.parent / "data" / "state.db")))


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


_conn: sqlite3.Connection | None = None


def conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = get_conn()
    return _conn


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── tracked_accounts ──────────────────────────────────────────────────────────

def get_active_accounts() -> list[sqlite3.Row]:
    return conn().execute(
        "SELECT * FROM tracked_accounts WHERE active = 1 ORDER BY handle"
    ).fetchall()


def upsert_account(handle: str, source: str = "manual") -> None:
    conn().execute(
        """INSERT INTO tracked_accounts (handle, added_at, source, active)
           VALUES (?, ?, ?, 1)
           ON CONFLICT(handle) DO UPDATE SET active = 1""",
        (handle.lstrip("@"), source, now_iso()),
    )
    conn().commit()


def update_account_checked(handle: str) -> None:
    conn().execute(
        "UPDATE tracked_accounts SET last_checked_at = ? WHERE handle = ?",
        (now_iso(), handle.lstrip("@")),
    )
    conn().commit()


# ── twitter_content ───────────────────────────────────────────────────────────

def tweet_exists(tweet_id: str) -> bool:
    row = conn().execute(
        "SELECT 1 FROM twitter_content WHERE id = ?", (tweet_id,)
    ).fetchone()
    return row is not None


def save_tweet(
    tweet_id: str,
    account: str,
    content: str,
    url: str,
    published_at: str,
    score: int,
    summary: str,
    notified: bool = False,
    source: str = "monitored",
) -> None:
    conn().execute(
        """INSERT OR IGNORE INTO twitter_content
           (id, account, content, url, published_at, score, summary, notified_at, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            tweet_id, account, content, url, published_at,
            score, summary,
            now_iso() if notified else None,
            source,
        ),
    )
    conn().commit()


def count_notified_today() -> int:
    today = datetime.now(timezone.utc).date().isoformat()
    row = conn().execute(
        "SELECT COUNT(*) FROM twitter_content WHERE notified_at LIKE ?",
        (f"{today}%",),
    ).fetchone()
    return row[0]


def mark_tweet_notified(tweet_id: str) -> None:
    conn().execute(
        "UPDATE twitter_content SET notified_at = ? WHERE id = ?",
        (now_iso(), tweet_id),
    )
    conn().commit()


# ── blog_posts ────────────────────────────────────────────────────────────────

def blog_post_exists(post_id: str) -> bool:
    row = conn().execute(
        "SELECT 1 FROM blog_posts WHERE id = ?", (post_id,)
    ).fetchone()
    return row is not None


def log_event(source: str, message: str, level: str = "info", detail: str = "") -> None:
    """Registra un evento del monitor para el dashboard en tiempo real."""
    conn().execute(
        """INSERT INTO monitor_events (source, level, message, detail, created_at)
           VALUES (?, ?, ?, ?, ?)""",
        (source, level, message, detail or None, now_iso()),
    )
    conn().commit()
    # Mantener solo los últimos 500 eventos para no crecer indefinidamente
    conn().execute(
        "DELETE FROM monitor_events WHERE id NOT IN (SELECT id FROM monitor_events ORDER BY id DESC LIMIT 500)"
    )
    conn().commit()


def save_blog_post(
    post_id: str,
    title: str,
    url: str,
    summary: str,
    published_at: str,
    source: str = "anthropic",
    notified: bool = False,
) -> None:
    conn().execute(
        """INSERT OR IGNORE INTO blog_posts
           (id, source, title, url, summary, published_at, notified_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            post_id, source, title, url, summary, published_at,
            now_iso() if notified else None,
        ),
    )
    conn().commit()
