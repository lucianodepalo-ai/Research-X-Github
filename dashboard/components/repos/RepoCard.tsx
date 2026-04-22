"use client";

import Link from "next/link";
import { Star, Bookmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import type { Repo } from "@/lib/types";
import { useState, useTransition } from "react";

const sourceColors: Record<string, string> = {
  search: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  trending: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  awesome: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  manual: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export function RepoCard({ repo }: { repo: Repo }) {
  const [bookmarked, setBookmarked] = useState(repo.bookmarked === 1);
  const [, startTransition] = useTransition();

  function toggleBookmark(e: React.MouseEvent) {
    e.preventDefault();
    const next = !bookmarked;
    setBookmarked(next);
    startTransition(async () => {
      await fetch(`/api/repos/${repo.id}/bookmark`, { method: "POST" });
    });
  }

  const sourceName = repo.source ?? "manual";
  const sourceClass = sourceColors[sourceName] ?? sourceColors.manual;

  return (
    <Link href={`/repos/${repo.id}`}>
      <Card className="bg-card border-border hover:border-primary/40 transition-colors h-full group cursor-pointer">
        <CardContent className="p-4 flex flex-col gap-3 h-full">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ScoreBadge score={repo.score} className="shrink-0" />
              <div className="min-w-0">
                <p className="mono text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {repo.full_name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {repo.stars !== null && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="w-3 h-3" />
                      {repo.stars.toLocaleString()}
                    </span>
                  )}
                  {repo.language && (
                    <Badge variant="outline" className="text-xs py-0 px-1.5 h-4 border-border text-muted-foreground">
                      {repo.language}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={toggleBookmark}
              className="shrink-0 p-1 rounded hover:bg-accent transition-colors"
              aria-label={bookmarked ? "Quitar de favoritos" : "Agregar a favoritos"}
            >
              <Bookmark
                className={`w-4 h-4 transition-colors ${bookmarked ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
              />
            </button>
          </div>

          {repo.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
              {repo.description}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 mt-auto">
            <Badge className={`text-xs border ${sourceClass} rounded-sm px-1.5 py-0`}>
              {sourceName}
            </Badge>
            <span className="text-xs text-muted-foreground/50 mono">
              {repo.first_seen_at.slice(0, 10)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
