import { Suspense } from "react";
import { getRepos, getLanguages, getStats } from "@/lib/queries";
import type { RepoFilters } from "@/lib/types";
import { RepoFilters as RepoFiltersComponent } from "@/components/repos/RepoFilters";
import { RepoGrid } from "@/components/repos/RepoGrid";
import { Pagination } from "@/components/shared/Pagination";
import { ExportButton } from "@/components/shared/ExportButton";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

export default async function ReposPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const filters: RepoFilters = {
    search: str(sp.search),
    language: str(sp.language),
    source: str(sp.source),
    status: (str(sp.status) as RepoFilters["status"]) ?? "all",
    sortBy: (str(sp.sortBy) as RepoFilters["sortBy"]) ?? "first_seen_at",
    sortDir: (str(sp.sortDir) as RepoFilters["sortDir"]) ?? "desc",
    page: num(str(sp.page), 1),
    pageSize: 24,
  };

  const { repos, total } = getRepos(filters);
  const languages = getLanguages();
  const stats = getStats();

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold mono text-primary">Biblioteca de Repos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {stats.total.toLocaleString()} repositorios descubiertos
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton />
          <Link
            href="/repos/new"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[0.8rem] bg-primary text-primary-foreground rounded-[min(var(--radius-md),12px)] hover:bg-primary/80 transition-colors font-medium"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Agregar
          </Link>
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <RepoFiltersComponent
          languages={languages}
          totalCount={stats.total}
          filteredCount={total}
        />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        }
      >
        <RepoGrid repos={repos} />
      </Suspense>

      <Suspense fallback={null}>
        <Pagination total={total} page={filters.page!} pageSize={filters.pageSize!} />
      </Suspense>
    </div>
  );
}
