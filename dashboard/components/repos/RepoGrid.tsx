import type { Repo } from "@/lib/types";
import { RepoCard } from "./RepoCard";

export function RepoGrid({ repos }: { repos: Repo[] }) {
  if (repos.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm border border-dashed border-border/50 rounded-xl">
        No se encontraron repos con los filtros actuales
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
      {repos.map((repo) => (
        <RepoCard key={repo.id} repo={repo} />
      ))}
    </div>
  );
}
