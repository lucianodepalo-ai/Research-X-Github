export const dynamic = "force-dynamic";
import { getBlogPosts, getBlogSourceCounts } from "@/lib/queries";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

const SOURCE_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  anthropic:  { label: "Anthropic", color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  hackernews: { label: "HN",        color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
  devto:      { label: "Dev.to",    color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
};

const ALL_SOURCES = [
  { key: undefined,      label: "Todas" },
  { key: "anthropic",    label: "Anthropic" },
  { key: "hackernews",   label: "Hacker News" },
  { key: "devto",        label: "Dev.to" },
];

export default async function NoticiasPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const source = str(sp.source);

  const { posts, total } = getBlogPosts({ source, pageSize: 60 });
  const counts = getBlogSourceCounts();
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold mono text-primary">Noticias & Artículos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {allCount} entradas · Anthropic, Hacker News y Dev.to
        </p>
      </div>

      {/* Filtros por fuente */}
      <div className="flex flex-wrap gap-2">
        {ALL_SOURCES.map(({ key, label }) => {
          const count = key ? (counts[key] ?? 0) : allCount;
          const active = source === key;
          const href = key ? `/blog?source=${key}` : "/blog";
          return (
            <Link
              key={label}
              href={href}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1.5 ${
                active
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {label}
              <span className="opacity-60">{count}</span>
            </Link>
          );
        })}
      </div>

      {posts.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
          Sin entradas para este filtro. El monitor agrega contenido automáticamente.
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => {
            const src = SOURCE_LABEL[post.source] ?? { label: post.source, color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" };
            return (
              <div
                key={post.id}
                className="bg-card border border-border rounded-lg p-3.5 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${src.bg} ${src.color}`}>
                        {src.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        {formatDate(post.published_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {post.title?.replace(/^\[(HN|Dev\.to|Anthropic)\]\s*/, "") ?? "Sin título"}
                    </p>
                    {post.summary && post.source !== "hackernews" && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                        {post.summary}
                      </p>
                    )}
                  </div>
                  {post.url && (
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-primary transition-colors mt-0.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
