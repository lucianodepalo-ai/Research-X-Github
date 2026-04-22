export interface Repo {
  id: number;
  full_name: string;
  first_seen_at: string;
  reported_at: string | null;
  score: number | null;
  html_url: string | null;
  description: string | null;
  stars: number | null;
  language: string | null;
  source: string | null;
  summary: string | null;
  use_case: string | null;
  bookmarked: number;
  added_manually: number;
}

export interface RepoFilters {
  search?: string;
  scoreMin?: number;
  scoreMax?: number;
  language?: string;
  source?: string;
  status?: "all" | "reported" | "unreported" | "bookmarked" | "manual";
  sortBy?: "score" | "stars" | "first_seen_at" | "reported_at";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface Stats {
  total: number;
  reported: number;
  avgScore: number | null;
  topLanguage: string | null;
  todayCount: number;
  bookmarkedCount: number;
}

export interface ActivityPoint {
  date: string;
  count: number;
}

export interface ReportDay {
  date: string;
  count: number;
  topScore: number | null;
}
