export const dynamic = "force-dynamic";
import { getStats, getActivityData, getRecentReports } from "@/lib/queries";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { RecentReports } from "@/components/dashboard/RecentReports";

export default async function DashboardPage() {
  const [stats, activity, reports] = await Promise.all([
    Promise.resolve(getStats()),
    Promise.resolve(getActivityData(30)),
    Promise.resolve(getRecentReports(7)),
  ]);

  return (
    <div className="space-y-5 max-w-full">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold mono text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Resumen de tu investigación GitHub
          </p>
        </div>
        <span className="text-xs text-muted-foreground/50 mono">
          {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
        </span>
      </div>

      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ActivityChart data={activity} />
        </div>
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Últimos reportes Telegram
          </h2>
          <RecentReports reports={reports} />
        </div>
      </div>
    </div>
  );
}
