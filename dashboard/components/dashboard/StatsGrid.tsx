import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Stats } from "@/lib/types";
import { Database, Star, Code2, Zap } from "lucide-react";

export function StatsGrid({ stats }: { stats: Stats }) {
  const items = [
    {
      title: "Total descubiertos",
      value: stats.total.toLocaleString(),
      sub: `${stats.reported} reportados a Telegram`,
      icon: Database,
      color: "text-blue-400",
    },
    {
      title: "Score promedio",
      value: stats.avgScore !== null ? `${stats.avgScore}/10` : "—",
      sub: "Relevancia IA promedio",
      icon: Star,
      color: "text-amber-400",
    },
    {
      title: "Lenguaje top",
      value: stats.topLanguage ?? "—",
      sub: "Más frecuente en repos",
      icon: Code2,
      color: "text-green-400",
    },
    {
      title: "Hoy",
      value: stats.todayCount.toLocaleString(),
      sub: `${stats.bookmarkedCount} en favoritos`,
      icon: Zap,
      color: "text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.title} className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {item.title}
            </CardTitle>
            <item.icon className={`w-4 h-4 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold mono">{item.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
