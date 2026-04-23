"use client";

import Link from "next/link";
import { Star, Bookmark, ExternalLink } from "lucide-react";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import type { Repo } from "@/lib/types";
import { useState, useTransition } from "react";

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  search:   { label: "Search",   cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  trending: { label: "Trending", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  awesome:  { label: "Curated",  cls: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  manual:   { label: "Manual",   cls: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

const CATEGORY_BADGE: Record<string, string> = {
  mcp:        "bg-cyan-500/10 text-cyan-400",
  automation: "bg-yellow-500/10 text-yellow-400",
  skills:     "bg-green-500/10 text-green-400",
  settings:   "bg-slate-500/10 text-slate-400",
  tokens:     "bg-pink-500/10 text-pink-400",
  security:   "bg-red-500/10 text-red-400",
  other:      "bg-slate-500/10 text-slate-500",
};

export function RepoCard({ repo }: { repo: Repo }) {
  const [bookmarked, setBookmarked] = useState(repo.bookmarked === 1);
  const [, startTransition] = useTransition();
  const src = SOURCE_BADGE[repo.source ?? "manual"] ?? SOURCE_BADGE.manual;
  const catCls = CATEGORY_BADGE[repo.category ?? "other"] ?? CATEGORY_BADGE.other;

  function toggleBookmark(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBookmarked((b) => !b);
    startTransition(async () => {
      await fetch(`/api/repos/${repo.id}/bookmark`, { method: "POST" });
    });
  }

  const [owner, repoName] = repo.full_name.split("/");

  return (
    <Link href={`/repos/${repo.id}`} className="group block">
      <div className="h-full rounded-xl border border-border bg-card hover:border-blue-500/40 hover:bg-blue-500/[0.03] transition-all duration-200 cursor-pointer">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-3">
          <ScoreBadge score={repo.score} className="shrink-0 w-10 h-10 text-sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground/60 mono leading-none mb-0.5">{owner}/</p>
                <p className="mono text-sm font-semibold text-foreground group-hover:text-blue-400 transition-colors truncate leading-snug">
                  {repoName}
                </p>
              </div>
              <button
                onClick={toggleBookmark}
                className="shrink-0 p-1 rounded hover:bg-accent transition-colors mt-0.5"
                aria-label={bookmarked ? "Quitar favorito" : "Agregar favorito"}
              >
                <Bookmark
                  className={`w-3.5 h-3.5 transition-colors ${
                    bookmarked ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40 hover:text-muted-foreground"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        {repo.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 px-4 pb-3 leading-relaxed">
            {repo.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between gap-2 px-4 pt-2 pb-3 border-t border-border/50">
          <div className="flex items-center gap-2 flex-wrap">
            {repo.stars !== null && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                <Star className="w-3 h-3" />
                {repo.stars >= 1000
                  ? `${(repo.stars / 1000).toFixed(1)}k`
                  : repo.stars.toLocaleString()}
              </span>
            )}
            {repo.language && (
              <span className="text-xs text-muted-foreground/60 border border-border/50 rounded px-1.5 py-0.5">
                {repo.language}
              </span>
            )}
            {repo.category && repo.category !== "other" && (
              <span className={`text-xs rounded px-1.5 py-0.5 ${catCls}`}>
                {repo.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] border rounded px-1.5 py-0.5 ${src.cls}`}>
              {src.label}
            </span>
            {repo.html_url && (
              <a
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground/30 hover:text-muted-foreground transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
