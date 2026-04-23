import type { Stats } from "@/lib/types";
import { Database, Star, Code2, Zap } from "lucide-react";

const items = (stats: Stats) => [
  {
    label: "Total descubiertos",
    value: stats.total.toLocaleString(),
    sub: `${stats.reported} reportados a Telegram`,
    icon: Database,
    color: "text-blue-400",
    border: "border-blue-500/20",
    bg: "bg-blue-500/5",
  },
  {
    label: "Score promedio",
    value: stats.avgScore !== null ? `${stats.avgScore}` : "—",
    sub: stats.avgScore !== null ? "/ 10 relevancia IA" : "Sin análisis aún",
    icon: Star,
    color: "text-amber-400",
    border: "border-amber-500/20",
    bg: "bg-amber-500/5",
  },
  {
    label: "Lenguaje top",
    value: stats.topLanguage ?? "—",
    sub: "Más frecuente en repos",
    icon: Code2,
    color: "text-emerald-400",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
  },
  {
    label: "Hoy",
    value: stats.todayCount.toLocaleString(),
    sub: `${stats.bookmarkedCount} en favoritos`,
    icon: Zap,
    color: "text-purple-400",
    border: "border-purple-500/20",
    bg: "bg-purple-500/5",
  },
];

export function StatsGrid({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items(stats).map((item) => (
        <div
          key={item.label}
          className={`rounded-xl border ${item.border} ${item.bg} p-5 flex flex-col gap-3`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              {item.label}
            </span>
            <item.icon className={`w-4 h-4 ${item.color} opacity-70`} />
          </div>
          <div>
            <p className={`text-4xl font-bold mono ${item.color} leading-none`}>
              {item.value}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{item.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
