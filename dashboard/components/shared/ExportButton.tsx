"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

export function ExportButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
      >
        <Download className="w-4 h-4" />
        Exportar
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <a
          href="/api/export?format=json"
          download="repos.json"
          className="flex w-full items-center px-3 py-1.5 text-sm hover:bg-accent rounded-sm cursor-pointer"
        >
          Exportar JSON
        </a>
        <a
          href="/api/export?format=csv"
          download="repos.csv"
          className="flex w-full items-center px-3 py-1.5 text-sm hover:bg-accent rounded-sm cursor-pointer"
        >
          Exportar CSV
        </a>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
