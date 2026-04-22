import { getRepo } from "@/lib/queries";
import { notFound } from "next/navigation";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Star, ArrowLeft, Bookmark } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(0, 10).split("-").reverse().join("/");
}

export default async function RepoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const repo = getRepo(Number(id));
  if (!repo) notFound();

  const sourceColors: Record<string, string> = {
    search: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    trending: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    awesome: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    manual: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  const sourceClass = sourceColors[repo.source ?? "manual"] ?? sourceColors.manual;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/repos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Biblioteca
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <ScoreBadge score={repo.score} className="w-12 h-12 text-base shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="mono text-xl font-bold text-foreground">{repo.full_name}</h1>
            {repo.bookmarked === 1 && (
              <Bookmark className="w-5 h-5 fill-amber-400 text-amber-400 mt-0.5 shrink-0" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {repo.stars !== null && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="w-4 h-4" />
                {repo.stars.toLocaleString()} estrellas
              </span>
            )}
            {repo.language && (
              <Badge variant="outline" className="border-border text-muted-foreground">
                {repo.language}
              </Badge>
            )}
            {repo.source && (
              <Badge className={`border ${sourceClass}`}>{repo.source}</Badge>
            )}
            {repo.html_url && (
              <a
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Ver en GitHub <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {repo.description && (
        <p className="text-muted-foreground">{repo.description}</p>
      )}

      {/* AI Analysis */}
      {(repo.summary || repo.use_case) && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Análisis IA
          </h2>
          {repo.summary && (
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Resumen</p>
              <p className="text-sm text-foreground leading-relaxed">{repo.summary}</p>
            </div>
          )}
          {repo.use_case && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm font-medium text-primary mb-2">💡 Caso de uso</p>
              <p className="text-sm text-foreground leading-relaxed">{repo.use_case}</p>
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Metadata
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <MetaItem label="Descubierto" value={formatDate(repo.first_seen_at)} />
          <MetaItem label="Reportado a Telegram" value={formatDate(repo.reported_at)} />
          <MetaItem label="ID GitHub" value={String(repo.id)} mono />
          <MetaItem label="Agregado manualmente" value={repo.added_manually ? "Sí" : "No"} />
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-card border border-border rounded-md p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
