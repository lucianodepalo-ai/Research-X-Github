import type { Repo } from "@/lib/types";
import { RepoCard } from "./RepoCard";

export function RepoGrid({ repos }: { repos: Repo[] }) {
  if (repos.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
        No se encontraron repos con los filtros actuales
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {repos.map((repo) => (
        <RepoCard key={repo.id} repo={repo} />
      ))}
    </div>
  );
}
