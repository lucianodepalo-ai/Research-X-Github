"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
}

export function Pagination({ total, page, pageSize }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => goTo(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft className="w-4 h-4" />
        Anterior
      </Button>
      <span className="text-sm text-muted-foreground mono">
        {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => goTo(page + 1)}
        disabled={page >= totalPages}
      >
        Siguiente
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
