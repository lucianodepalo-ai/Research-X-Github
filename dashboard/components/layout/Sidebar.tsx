"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, BookOpen, BookmarkIcon, History, PlusCircle, MessageSquare, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart2 },
  { href: "/repos", label: "Repos GitHub", icon: BookOpen },
  { href: "/twitter", label: "Twitter / X", icon: MessageSquare },
  { href: "/blog", label: "Blog Anthropic", icon: Newspaper },
  { href: "/reports", label: "Reportes", icon: History },
  { href: "/repos?status=bookmarked", label: "Favoritos", icon: BookmarkIcon },
  { href: "/repos/new", label: "Agregar repo", icon: PlusCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-screen w-[220px] bg-sidebar border-r border-sidebar-border flex flex-col z-40">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <span className="mono text-primary font-bold text-base tracking-tight">
          Research-X
        </span>
        <span className="block text-muted-foreground text-xs mt-0.5">GitHub Intelligence</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && !href.includes("?") && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-primary font-medium"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground">Research-X Bot</p>
        <p className="text-xs text-muted-foreground/60">Corre diariamente 23:00 ART</p>
      </div>
    </aside>
  );
}
