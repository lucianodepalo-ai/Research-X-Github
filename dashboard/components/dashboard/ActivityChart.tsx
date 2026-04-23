"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ActivityPoint } from "@/lib/types";

function formatDate(dateStr: string) {
  const [, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}

export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          Repos descubiertos — últimos 30 días
        </p>
        <div className="flex items-center justify-center h-48 border border-dashed border-border/50 rounded-lg">
          <div className="text-center">
            <p className="text-3xl font-bold mono text-muted-foreground/20">0</p>
            <p className="text-xs text-muted-foreground/40 mt-1">
              El bot corre diariamente a las 23:00 ART
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
        Repos descubiertos — últimos 30 días
      </p>
      <div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#111", border: "1px solid #1e293b", borderRadius: 6 }}
              labelStyle={{ color: "#94a3b8", fontSize: 12 }}
              itemStyle={{ color: "#60a5fa" }}
              labelFormatter={(label: unknown) => formatDate(String(label))}
            />
            <Area
              type="monotone"
              dataKey="count"
              name="Repos"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#blueGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
