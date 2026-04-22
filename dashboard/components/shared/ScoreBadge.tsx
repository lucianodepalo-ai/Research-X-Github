import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number | null;
  className?: string;
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <span className={cn("inline-flex items-center justify-center w-9 h-9 rounded-full border text-xs font-bold mono bg-slate-500/10 text-slate-400 border-slate-500/20", className)}>
        —
      </span>
    );
  }

  const color =
    score >= 7
      ? "bg-green-500/10 text-green-400 border-green-500/20"
      : score >= 4
      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
      : "bg-red-500/10 text-red-400 border-red-500/20";

  return (
    <span className={cn("inline-flex items-center justify-center w-9 h-9 rounded-full border text-xs font-bold mono", color, className)}>
      {score}
    </span>
  );
}
