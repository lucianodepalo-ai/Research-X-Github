"use client";

import { useEffect, useState, useRef } from "react";

interface MonitorEvent {
  id: number;
  source: string;
  level: string;
  message: string;
  detail: string | null;
  created_at: string;
}

interface LiveStats {
  reposToday: number;
  reposTotal: number;
  blogsToday: number;
  twitterToday: number;
  lastGithubLive: string | null;
  lastAnthropic: string | null;
  lastHN: string | null;
  lastDevto: string | null;
}

const SOURCE_META: Record<string, { label: string; emoji: string; color: string }> = {
  github_live:  { label: "GitHub Live",    emoji: "🐙", color: "text-emerald-400" },
  anthropic:    { label: "Anthropic Blog", emoji: "📢", color: "text-blue-400"    },
  hackernews:   { label: "Hacker News",    emoji: "🟡", color: "text-amber-400"   },
  devto:        { label: "Dev.to",         emoji: "📝", color: "text-purple-400"  },
  twitter_rss:  { label: "Twitter RSS",    emoji: "🐦", color: "text-sky-400"     },
  monitor:      { label: "Monitor",        emoji: "⚙️", color: "text-slate-400"   },
};

const LEVEL_COLOR: Record<string, string> = {
  info:    "text-slate-300",
  success: "text-emerald-400",
  warn:    "text-amber-400",
  error:   "text-red-400",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function relativeTime(iso: string | null): string {
  if (!iso) return "Nunca";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `Hace ${diff}s`;
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`;
  return `Hace ${Math.floor(diff / 3600)}h`;
}

function isActive(iso: string | null): boolean {
  if (!iso) return false;
  return (Date.now() - new Date(iso).getTime()) < 3 * 60 * 60 * 1000; // activo si corrió en las últimas 3h
}

export default function LivePage() {
  const [events, setEvents] = useState<MonitorEvent[]>([]);
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [monitorOnline, setMonitorOnline] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  async function fetchData() {
    try {
      const r = await fetch("/api/live", { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      setEvents(data.events);
      setStats(data.stats);
      setLastUpdate(new Date().toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }));
      // Monitor está online si tiene eventos en las últimas 2 horas
      const latest = data.events[0];
      setMonitorOnline(latest ? (Date.now() - new Date(latest.created_at).getTime()) < 2 * 60 * 60 * 1000 : false);
    } catch {
      setMonitorOnline(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScrollRef.current && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  const sources = [
    { key: "GitHub Live",    iso: stats?.lastGithubLive ?? null,  emoji: "🐙", interval: "cada 2h" },
    { key: "Anthropic Blog", iso: stats?.lastAnthropic ?? null,   emoji: "📢", interval: "cada 2h" },
    { key: "Hacker News",    iso: stats?.lastHN ?? null,          emoji: "🟡", interval: "cada 2h" },
    { key: "Dev.to",         iso: stats?.lastDevto ?? null,       emoji: "📝", interval: "cada 3h" },
  ];

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Estado del monitor — bloque principal */}
      <div className={`rounded-xl border-2 p-5 flex items-center justify-between transition-colors ${
        monitorOnline
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-slate-700 bg-slate-500/5"
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-4 h-4 rounded-full shrink-0 ${
            monitorOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
          }`} />
          <div>
            <p className="font-bold text-lg mono">
              Monitor {monitorOnline ? "activo" : "inactivo"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {monitorOnline
                ? "Buscando repos, artículos y novedades en tiempo real"
                : "Sin actividad reciente"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Último update</p>
          <p className="mono text-sm font-medium">{lastUpdate || "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">refresh cada 8s</p>
        </div>
      </div>

      {/* Stats rápidas */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold mono text-emerald-400">{stats.reposToday}</p>
            <p className="text-xs text-muted-foreground mt-1">repos hoy</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold mono text-primary">{stats.reposTotal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">repos total</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold mono text-blue-400">{stats.blogsToday}</p>
            <p className="text-xs text-muted-foreground mt-1">artículos hoy</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold mono text-amber-400">{events.length}</p>
            <p className="text-xs text-muted-foreground mt-1">eventos recientes</p>
          </div>
        </div>
      )}

      {/* Estado por fuente */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {sources.map(({ key, iso, emoji, interval }) => {
          const active = isActive(iso);
          return (
            <div key={key} className={`rounded-lg border px-3 py-2.5 transition-colors ${
              active ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card"
            }`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">{emoji} {key}</p>
                <span className={`w-2 h-2 rounded-full ${active ? "bg-emerald-400" : "bg-slate-600"}`} />
              </div>
              <p className="text-xs mono text-muted-foreground mt-1">{relativeTime(iso)}</p>
              <p className="text-xs text-muted-foreground/50">{interval}</p>
            </div>
          );
        })}
      </div>

      {/* Log en tiempo real */}
      <div className="bg-[#050505] border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
          <span className="text-xs font-medium text-muted-foreground mono">LOG EN TIEMPO REAL</span>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              onChange={(e) => { autoScrollRef.current = e.target.checked; }}
            />
            Auto-scroll
          </label>
        </div>
        <div
          ref={logRef}
          className="h-[360px] overflow-y-auto p-3 space-y-0.5 font-mono text-xs"
          style={{ scrollbarWidth: "thin" }}
        >
          {events.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">
              Esperando actividad del monitor...
            </p>
          ) : (
            [...events].reverse().map((ev) => {
              const src = SOURCE_META[ev.source] ?? { label: ev.source, emoji: "•", color: "text-slate-400" };
              const lvlColor = LEVEL_COLOR[ev.level] ?? "text-slate-300";
              return (
                <div key={ev.id} className="flex items-start gap-2 py-0.5 hover:bg-white/[0.02] px-1 rounded">
                  <span className="text-muted-foreground/40 w-16 shrink-0 text-[10px] pt-0.5">
                    {formatTime(ev.created_at)}
                  </span>
                  <span className={`${src.color} w-24 shrink-0 truncate text-[10px] pt-0.5`}>
                    {src.emoji} {src.label}
                  </span>
                  <span className={`${lvlColor} flex-1`}>{ev.message}</span>
                  {ev.detail && (
                    <span className="text-muted-foreground/40 text-[10px] shrink-0 pt-0.5 max-w-[160px] truncate">
                      {ev.detail}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
