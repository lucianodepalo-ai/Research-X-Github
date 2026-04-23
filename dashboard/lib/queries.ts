import { getDb } from "./db";
import type {
  Repo,
  RepoFilters,
  Stats,
  ActivityPoint,
  ReportDay,
  TwitterContent,
  BlogPost,
  TrackedAccount,
} from "./types";

export function getStats(): Stats {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const total = (db.prepare("SELECT COUNT(*) as c FROM seen_repos").get() as { c: number }).c;
  const reported = (db.prepare("SELECT COUNT(*) as c FROM seen_repos WHERE reported_at IS NOT NULL").get() as { c: number }).c;
  const bookmarkedCount = (db.prepare("SELECT COUNT(*) as c FROM seen_repos WHERE bookmarked = 1").get() as { c: number }).c;
  const todayCount = (db.prepare("SELECT COUNT(*) as c FROM seen_repos WHERE DATE(first_seen_at) = ?").get(today) as { c: number }).c;

  const avgRow = db.prepare("SELECT AVG(score) as a FROM seen_repos WHERE score IS NOT NULL").get() as { a: number | null };
  const langRow = db
    .prepare(
      `SELECT language, COUNT(*) as c FROM seen_repos
       WHERE language IS NOT NULL AND language != ''
       GROUP BY language ORDER BY c DESC LIMIT 1`
    )
    .get() as { language: string; c: number } | undefined;

  return {
    total,
    reported,
    avgScore: avgRow.a ? Math.round(avgRow.a * 10) / 10 : null,
    topLanguage: langRow?.language ?? null,
    todayCount,
    bookmarkedCount,
  };
}

export function getActivityData(days = 30): ActivityPoint[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DATE(first_seen_at) as date, COUNT(*) as count
       FROM seen_repos
       WHERE DATE(first_seen_at) >= DATE('now', ?)
       GROUP BY DATE(first_seen_at)
       ORDER BY date ASC`
    )
    .all(`-${days} days`) as ActivityPoint[];
  return rows;
}

export function getRecentReports(limit = 7): ReportDay[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DATE(reported_at) as date, COUNT(*) as count, MAX(score) as topScore
       FROM seen_repos
       WHERE reported_at IS NOT NULL
       GROUP BY DATE(reported_at)
       ORDER BY date DESC
       LIMIT ?`
    )
    .all(limit) as ReportDay[];
  return rows;
}

export function getLanguages(): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT language FROM seen_repos
       WHERE language IS NOT NULL AND language != ''
       ORDER BY language ASC`
    )
    .all() as { language: string }[];
  return rows.map((r) => r.language);
}

export function getRepos(
  filters: RepoFilters = {}
): { repos: Repo[]; total: number } {
  const db = getDb();
  const {
    search,
    scoreMin,
    scoreMax,
    language,
    source,
    category,
    status,
    sortBy = "first_seen_at",
    sortDir = "desc",
    page = 1,
    pageSize = 24,
  } = filters;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (search) {
    conditions.push(
      `id IN (SELECT rowid FROM repos_fts WHERE repos_fts MATCH ?)`
    );
    params.push(`${search}*`);
  }
  if (scoreMin !== undefined) {
    conditions.push("score >= ?");
    params.push(scoreMin);
  }
  if (scoreMax !== undefined) {
    conditions.push("score <= ?");
    params.push(scoreMax);
  }
  if (language) {
    conditions.push("language = ?");
    params.push(language);
  }
  if (source) {
    conditions.push("source = ?");
    params.push(source);
  }
  if (category && category !== "all") {
    conditions.push("category = ?");
    params.push(category);
  }
  if (status === "reported") {
    conditions.push("reported_at IS NOT NULL");
  } else if (status === "unreported") {
    conditions.push("reported_at IS NULL");
  } else if (status === "bookmarked") {
    conditions.push("bookmarked = 1");
  } else if (status === "manual") {
    conditions.push("added_manually = 1");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const safeSortBy = ["score", "stars", "first_seen_at", "reported_at"].includes(sortBy)
    ? sortBy
    : "first_seen_at";
  const safeSortDir = sortDir === "asc" ? "ASC" : "DESC";

  const total = (
    db.prepare(`SELECT COUNT(*) as c FROM seen_repos ${where}`).get(...params) as { c: number }
  ).c;

  const offset = (page - 1) * pageSize;
  const repos = db
    .prepare(
      `SELECT * FROM seen_repos ${where}
       ORDER BY ${safeSortBy} ${safeSortDir} NULLS LAST
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset) as Repo[];

  return { repos, total };
}

export function getRepo(id: number): Repo | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM seen_repos WHERE id = ?").get(id) as Repo | undefined) ?? null;
}

export function getReportDays(): ReportDay[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT DATE(reported_at) as date, COUNT(*) as count, MAX(score) as topScore
       FROM seen_repos
       WHERE reported_at IS NOT NULL
       GROUP BY DATE(reported_at)
       ORDER BY date DESC`
    )
    .all() as ReportDay[];
}

export function getReposByReportDate(date: string): Repo[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM seen_repos
       WHERE DATE(reported_at) = ?
       ORDER BY score DESC NULLS LAST`
    )
    .all(date) as Repo[];
}

export function toggleBookmark(id: number, value: 0 | 1): void {
  const db = getDb();
  db.prepare("UPDATE seen_repos SET bookmarked = ? WHERE id = ?").run(value, id);
}

export function insertManualRepo(data: {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  stars: number;
  language: string | null;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO seen_repos
     (id, full_name, first_seen_at, html_url, description, stars, language, source, added_manually)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', 1)`
  ).run(
    data.id,
    data.full_name,
    new Date().toISOString(),
    data.html_url,
    data.description,
    data.stars,
    data.language
  );
}

export function getAllRepos(): Repo[] {
  const db = getDb();
  return db.prepare("SELECT * FROM seen_repos ORDER BY first_seen_at DESC").all() as Repo[];
}

export function getCategories(): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT category FROM seen_repos
       WHERE category IS NOT NULL AND category != ''
       ORDER BY category ASC`
    )
    .all() as { category: string }[];
  return rows.map((r) => r.category);
}

// ── Twitter ───────────────────────────────────────────────────────────────────

export function getTwitterFeed(
  filters: { account?: string; scoreMin?: number; page?: number; pageSize?: number } = {}
): { items: TwitterContent[]; total: number } {
  const db = getDb();
  const { account, scoreMin = 5, page = 1, pageSize = 30 } = filters;

  const conditions = ["score >= ?"];
  const params: (string | number)[] = [scoreMin];

  if (account) {
    conditions.push("account = ?");
    params.push(account);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const total = (
    db.prepare(`SELECT COUNT(*) as c FROM twitter_content ${where}`).get(...params) as { c: number }
  ).c;

  const offset = (page - 1) * pageSize;
  const items = db
    .prepare(
      `SELECT * FROM twitter_content ${where}
       ORDER BY published_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset) as TwitterContent[];

  return { items, total };
}

export function getTrackedAccounts(): TrackedAccount[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM tracked_accounts ORDER BY source, handle")
    .all() as TrackedAccount[];
}

export function getTwitterStats(): { total: number; todayCount: number; accountCount: number } {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const total = (db.prepare("SELECT COUNT(*) as c FROM twitter_content WHERE score >= 5").get() as { c: number }).c;
  const todayCount = (
    db.prepare("SELECT COUNT(*) as c FROM twitter_content WHERE DATE(published_at) = ?").get(today) as { c: number }
  ).c;
  const accountCount = (
    db.prepare("SELECT COUNT(*) as c FROM tracked_accounts WHERE active = 1").get() as { c: number }
  ).c;
  return { total, todayCount, accountCount };
}

// ── Blog posts ────────────────────────────────────────────────────────────────

export function getBlogPosts(
  filters: { page?: number; pageSize?: number } = {}
): { posts: BlogPost[]; total: number } {
  const db = getDb();
  const { page = 1, pageSize = 20 } = filters;

  const total = (db.prepare("SELECT COUNT(*) as c FROM blog_posts").get() as { c: number }).c;
  const offset = (page - 1) * pageSize;
  const posts = db
    .prepare(
      `SELECT * FROM blog_posts
       ORDER BY published_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(pageSize, offset) as BlogPost[];

  return { posts, total };
}

// ── Monitor events (live view) ────────────────────────────────────────────────

export interface MonitorEvent {
  id: number;
  source: string;
  level: string;
  message: string;
  detail: string | null;
  created_at: string;
}

export interface LiveStats {
  reposToday: number;
  reposTotal: number;
  blogsToday: number;
  twitterToday: number;
  lastGithubLive: string | null;
  lastAnthropic: string | null;
  lastHN: string | null;
  lastDevto: string | null;
}

export function getRecentEvents(limit = 80): MonitorEvent[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM monitor_events ORDER BY id DESC LIMIT ?`
    )
    .all(limit) as MonitorEvent[];
}

export function getLiveStats(): LiveStats {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const reposToday = (db.prepare(
    "SELECT COUNT(*) as c FROM seen_repos WHERE DATE(first_seen_at) = ?"
  ).get(today) as { c: number }).c;

  const reposTotal = (db.prepare("SELECT COUNT(*) as c FROM seen_repos").get() as { c: number }).c;

  const blogsToday = (db.prepare(
    "SELECT COUNT(*) as c FROM blog_posts WHERE DATE(published_at) = ?"
  ).get(today) as { c: number }).c;

  const twitterToday = (db.prepare(
    "SELECT COUNT(*) as c FROM twitter_content WHERE DATE(published_at) = ?"
  ).get(today) as { c: number }).c;

  const lastEvent = (source: string) =>
    (db.prepare(
      "SELECT created_at FROM monitor_events WHERE source = ? ORDER BY id DESC LIMIT 1"
    ).get(source) as { created_at: string } | undefined)?.created_at ?? null;

  return {
    reposToday,
    reposTotal,
    blogsToday,
    twitterToday,
    lastGithubLive: lastEvent("github_live"),
    lastAnthropic: lastEvent("anthropic"),
    lastHN: lastEvent("hackernews"),
    lastDevto: lastEvent("devto"),
  };
}

export function getLatestBlogPost(): BlogPost | null {
  const db = getDb();
  return (
    db.prepare("SELECT * FROM blog_posts ORDER BY published_at DESC LIMIT 1").get() as BlogPost | undefined
  ) ?? null;
}
