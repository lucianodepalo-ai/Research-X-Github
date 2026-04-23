import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = new URL('../../data/state.db', import.meta.url).pathname;
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS seen_repos (
    id INTEGER PRIMARY KEY,
    full_name TEXT NOT NULL,
    first_seen_at TEXT NOT NULL,
    reported_at TEXT,
    score INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_seen_repos_reported ON seen_repos(reported_at);
`);

// Add new columns safely (older SQLite lacks ADD COLUMN IF NOT EXISTS)
const existingCols = new Set(
  db.prepare('PRAGMA table_info(seen_repos)').all().map((c) => c.name),
);
const newCols = [
  'html_url TEXT',
  'description TEXT',
  'stars INTEGER',
  'language TEXT',
  'source TEXT',
  'summary TEXT',
  'use_case TEXT',
  'bookmarked INTEGER DEFAULT 0',
  'added_manually INTEGER DEFAULT 0',
  'category TEXT',
];
for (const col of newCols) {
  const name = col.split(' ')[0];
  if (!existingCols.has(name)) {
    db.exec(`ALTER TABLE seen_repos ADD COLUMN ${col}`);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS monitor_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    level TEXT DEFAULT 'info',
    message TEXT NOT NULL,
    detail TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_events_created ON monitor_events(created_at DESC);
  CREATE TABLE IF NOT EXISTS twitter_content (
    id           TEXT PRIMARY KEY,
    account      TEXT NOT NULL,
    content      TEXT NOT NULL,
    url          TEXT,
    published_at TEXT,
    score        INTEGER,
    summary      TEXT,
    notified_at  TEXT,
    source       TEXT DEFAULT 'monitored'
  );
  CREATE TABLE IF NOT EXISTS blog_posts (
    id           TEXT PRIMARY KEY,
    source       TEXT DEFAULT 'anthropic',
    title        TEXT,
    url          TEXT,
    summary      TEXT,
    published_at TEXT,
    notified_at  TEXT,
    score        INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS tracked_accounts (
    handle          TEXT PRIMARY KEY,
    added_at        TEXT,
    source          TEXT DEFAULT 'manual',
    active          INTEGER DEFAULT 1,
    last_checked_at TEXT
  );
`);

// Migration: add score to blog_posts if not present
{
  const hasBlogScore = db.prepare("PRAGMA table_info(blog_posts)").all().some(c => c.name === 'score');
  if (!hasBlogScore) {
    db.exec("ALTER TABLE blog_posts ADD COLUMN score INTEGER DEFAULT 0");
  }
}

db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS repos_fts USING fts5(
    full_name, description, summary, use_case,
    content=seen_repos, content_rowid=id
  );
  CREATE TRIGGER IF NOT EXISTS repos_fts_insert AFTER INSERT ON seen_repos BEGIN
    INSERT INTO repos_fts(rowid, full_name, description, summary, use_case)
    VALUES (new.id, new.full_name, new.description, new.summary, new.use_case);
  END;
  CREATE TRIGGER IF NOT EXISTS repos_fts_update AFTER UPDATE ON seen_repos BEGIN
    INSERT INTO repos_fts(repos_fts, rowid, full_name, description, summary, use_case)
    VALUES ('delete', old.id, old.full_name, old.description, old.summary, old.use_case);
    INSERT INTO repos_fts(rowid, full_name, description, summary, use_case)
    VALUES (new.id, new.full_name, new.description, new.summary, new.use_case);
  END;
`);

const stmtIsReported = db.prepare(
  'SELECT 1 FROM seen_repos WHERE id = ? AND reported_at IS NOT NULL',
);
const stmtUpsertSeen = db.prepare(`
  INSERT INTO seen_repos (id, full_name, first_seen_at)
  VALUES (?, ?, ?)
  ON CONFLICT(id) DO NOTHING
`);
const stmtMarkReported = db.prepare(`
  UPDATE seen_repos SET
    reported_at = ?, score = ?,
    html_url = ?, description = ?, stars = ?,
    language = ?, source = ?, summary = ?, use_case = ?,
    category = ?
  WHERE id = ?
`);

export function isReported(repoId) {
  return !!stmtIsReported.get(repoId);
}

export function markSeen(repo) {
  stmtUpsertSeen.run(repo.id, repo.full_name, new Date().toISOString());
}

export function markReported(repoId, repo) {
  stmtMarkReported.run(
    new Date().toISOString(), repo.score,
    repo.html_url ?? null, repo.description ?? null, repo.stars ?? null,
    repo.language ?? null, repo.source ?? null, repo.summary ?? null, repo.use_case ?? null,
    repo.category ?? null,
    repoId,
  );
}

// IDs of repos reported more than `days` ago — eligible for re-report as fallback
export function getStaleReportedIds(days = 30) {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = db
    .prepare('SELECT id FROM seen_repos WHERE reported_at IS NOT NULL AND reported_at < ?')
    .all(cutoff);
  return new Set(rows.map((r) => r.id));
}

export { db };
