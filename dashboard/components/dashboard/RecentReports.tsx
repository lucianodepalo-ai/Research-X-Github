import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { ReportDay } from "@/lib/types";
import { CalendarDays } from "lucide-react";

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function RecentReports({ reports }: { reports: ReportDay[] }) {
  if (reports.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Aún no hay reportes enviados a Telegram
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reports.map((r) => (
        <Link key={r.date} href={`/reports#${r.date}`}>
          <Card className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-between py-3 px-4">
              <div className="flex items-center gap-3">
                <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium mono">{formatDate(r.date)}</p>
                  <p className="text-xs text-muted-foreground">{r.count} repos reportados</p>
                </div>
              </div>
              {r.topScore !== null && (
                <span className="text-xs mono text-green-400 font-bold">
                  Top: {r.topScore}/10
                </span>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
