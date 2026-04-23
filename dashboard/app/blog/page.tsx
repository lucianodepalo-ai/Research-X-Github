import { getBlogPosts } from "@/lib/queries";
import { ExternalLink } from "lucide-react";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "long", year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export default async function BlogPage() {
  const { posts, total } = getBlogPosts({ pageSize: 50 });

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold mono text-primary">Blog Anthropic</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {total} posts · Revisado cada 2 horas
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
          Aún no hay posts. El monitor los agrega automáticamente cada 2 horas.
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-card border border-border rounded-lg p-4 space-y-2 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug">
                    {post.title ?? "Sin título"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(post.published_at)}
                  </p>
                </div>
                {post.url && (
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {post.summary && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {post.summary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
