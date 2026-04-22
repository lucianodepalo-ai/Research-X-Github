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

const stmtIsReported = db.prepare(
  'SELECT 1 FROM seen_repos WHERE id = ? AND reported_at IS NOT NULL',
);
const stmtUpsertSeen = db.prepare(`
  INSERT INTO seen_repos (id, full_name, first_seen_at)
  VALUES (?, ?, ?)
  ON CONFLICT(id) DO NOTHING
`);
const stmtMarkReported = db.prepare(
  'UPDATE seen_repos SET reported_at = ?, score = ? WHERE id = ?',
);

export function isReported(repoId) {
  return !!stmtIsReported.get(repoId);
}

export function markSeen(repo) {
  stmtUpsertSeen.run(repo.id, repo.full_name, new Date().toISOString());
}

export function markReported(repoId, score) {
  stmtMarkReported.run(new Date().toISOString(), score, repoId);
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
