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
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold mono text-primary">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Resumen de tu investigación GitHub
        </p>
      </div>

      <StatsGrid stats={stats} />

      <ActivityChart data={activity} />

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Reportes recientes a Telegram
        </h2>
        <RecentReports reports={reports} />
      </div>
    </div>
  );
}
