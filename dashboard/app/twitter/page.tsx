import { getTwitterFeed, getTrackedAccounts, getTwitterStats } from "@/lib/queries";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { ExternalLink } from "lucide-react";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export default async function TwitterPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const account = str(sp.account);

  const { items, total } = getTwitterFeed({ account, scoreMin: 5, pageSize: 50 });
  const accounts = getTrackedAccounts();
  const stats = getTwitterStats();

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold mono text-primary">Twitter / X</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {stats.accountCount} cuentas monitoreadas · {stats.total} tweets relevantes
        </p>
      </div>

      {/* Cuentas activas */}
      <div className="flex flex-wrap gap-2">
        <a
          href="/twitter"
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!account ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50"}`}
        >
          Todas
        </a>
        {accounts.filter(a => a.active).map((acc) => (
          <a
            key={acc.handle}
            href={`/twitter?account=${acc.handle}`}
            className={`text-xs mono px-2.5 py-1 rounded-full border transition-colors ${account === acc.handle ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50"}`}
          >
            @{acc.handle}
          </a>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
          {accounts.length === 0
            ? "No hay cuentas monitoreadas aún. Ejecutá python monitor/setup_twitter.py para comenzar."
            : "No hay tweets relevantes todavía. El monitor revisa cada 45 minutos."}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((tweet) => (
            <div
              key={tweet.id}
              className="bg-card border border-border rounded-lg p-4 space-y-2 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <ScoreBadge score={tweet.score} />
                  <div>
                    <p className="mono text-sm font-semibold text-primary">@{tweet.account}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(tweet.published_at)}</p>
                  </div>
                </div>
                {tweet.url && (
                  <a
                    href={tweet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {tweet.summary && (
                <p className="text-sm text-foreground">{tweet.summary}</p>
              )}

              <p className="text-xs text-muted-foreground/70 line-clamp-2 italic">
                {tweet.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
