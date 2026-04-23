export const dynamic = "force-dynamic";
import { getReportDays, getReposByReportDate } from "@/lib/queries";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${day} ${months[parseInt(month) - 1]} ${year}`;
}

export default async function ReportsPage() {
  const days = getReportDays();

  if (days.length === 0) {
    return (
      <div className="max-w-3xl space-y-4">
        <h1 className="text-xl font-bold mono text-primary">Historial de Reportes</h1>
        <p className="text-muted-foreground">Aún no hay reportes enviados a Telegram.</p>
      </div>
    );
  }

  const daysWithRepos = days.map((day) => ({
    ...day,
    repos: getReposByReportDate(day.date),
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold mono text-primary">Historial de Reportes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {days.length} reportes enviados a Telegram
        </p>
      </div>

      <div className="space-y-8">
        {daysWithRepos.map(({ date, count, topScore, repos }) => (
          <div key={date} id={date} className="space-y-3">
            <div className="flex items-center gap-3 border-b border-border pb-2">
              <div>
                <h2 className="mono font-bold text-foreground">{formatDate(date)}</h2>
                <p className="text-xs text-muted-foreground">
                  {count} repos · Score máximo:{" "}
                  {topScore !== null ? `${topScore}/10` : "—"}
                </p>
              </div>
            </div>

            <div className="space-y-2 pl-2">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
                >
                  <ScoreBadge score={repo.score} />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/repos/${repo.id}`}
                      className="mono text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                    >
                      {repo.full_name}
                    </Link>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {repo.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {repo.stars !== null && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="w-3 h-3" />
                        {repo.stars.toLocaleString()}
                      </span>
                    )}
                    {repo.html_url && (
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
