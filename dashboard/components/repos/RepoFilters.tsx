"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RepoFiltersProps {
  languages: string[];
  totalCount: number;
  filteredCount: number;
}

export function RepoFilters({ languages, totalCount, filteredCount }: RepoFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const hasFilters = searchParams.size > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            defaultValue={searchParams.get("search") ?? ""}
            placeholder="Buscar repos..."
            className="pl-9"
            onChange={(e) => {
              const val = e.target.value;
              setTimeout(() => updateParam("search", val), 300);
            }}
          />
        </div>

        <Select
          defaultValue={searchParams.get("language") ?? "all"}
          onValueChange={(v) => updateParam("language", v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Lenguaje" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {languages.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          defaultValue={searchParams.get("source") ?? "all"}
          onValueChange={(v) => updateParam("source", v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Fuente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="search">GitHub Search</SelectItem>
            <SelectItem value="trending">Trending</SelectItem>
            <SelectItem value="awesome">Awesome Lists</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>

        <Select
          defaultValue={searchParams.get("status") ?? "all"}
          onValueChange={(v) => updateParam("status", v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="reported">Reportados</SelectItem>
            <SelectItem value="unreported">Sin reportar</SelectItem>
            <SelectItem value="bookmarked">Favoritos</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>

        <Select
          defaultValue={`${searchParams.get("sortBy") ?? "first_seen_at"}-${searchParams.get("sortDir") ?? "desc"}`}
          onValueChange={(v) => {
            const [sortBy, sortDir] = (v ?? "first_seen_at-desc").split("-");
            const params = new URLSearchParams(searchParams.toString());
            params.set("sortBy", sortBy);
            params.set("sortDir", sortDir);
            params.delete("page");
            startTransition(() => router.push(`${pathname}?${params.toString()}`));
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="first_seen_at-desc">Más reciente</SelectItem>
            <SelectItem value="first_seen_at-asc">Más antiguo</SelectItem>
            <SelectItem value="score-desc">Mayor score</SelectItem>
            <SelectItem value="stars-desc">Más estrellas</SelectItem>
            <SelectItem value="reported_at-desc">Último reporte</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(pathname)}
            className="text-muted-foreground gap-1"
          >
            <X className="w-3 h-3" />
            Limpiar
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {filteredCount} de {totalCount} repos
      </p>
    </div>
  );
}
