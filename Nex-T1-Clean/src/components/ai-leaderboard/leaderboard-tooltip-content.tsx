"use client";

import type { TooltipProps } from "recharts";

import { formatBucketLabel, formatCurrency } from "@/components/ai-leaderboard/ai-leaderboard.utils";
import type { IntervalOption } from "@/types/ai-leaderboard";
import { glassSurfaceStyle } from "@/lib/ui/surface";

export function LeaderboardTooltipContent({
  active,
  payload,
  label,
  interval,
}: TooltipProps<number, string> & { interval: IntervalOption }) {
  if (!active || !payload || payload.length === 0) return null;

  const rows = payload
    .filter((entry) => entry && entry.value != null)
    .map((entry) => ({
      name: typeof entry.name === "string" ? entry.name : "Series",
      value: Number(entry.value),
      color: (entry.stroke as string | undefined) ?? "#111827",
    }))
    .filter((entry) => Number.isFinite(entry.value));

  if (rows.length === 0) return null;

  return (
    <div
      className="bg-card text-foreground backdrop-blur-lg max-w-[320px] rounded-[18px] border border-border px-3 py-2 text-[11px] leading-4 shadow-md drop-shadow-md"
      style={{ borderRadius: "18px", ...glassSurfaceStyle }}
    >
      <div className="font-medium text-foreground">{formatBucketLabel(String(label ?? ""), interval)}</div>
      <div className="mt-1 space-y-1">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between gap-4">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
              <span className="truncate text-muted-foreground">{row.name}</span>
            </span>
            <span className="tabular-nums text-foreground">{formatCurrency(row.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

