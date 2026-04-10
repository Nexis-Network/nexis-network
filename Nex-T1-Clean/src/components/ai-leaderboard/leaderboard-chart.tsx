"use client";

import { Loader2 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { LeaderboardTooltipContent } from "./leaderboard-tooltip-content";
import { formatBucketLabel, formatCurrency } from "./ai-leaderboard.utils";
import { COLORS } from "./ai-leaderboard.constants";
import { cn } from "@/lib/utils";
import type { IntervalOption, LeaderboardAgent } from "@/types/ai-leaderboard";

type SeriesMeta = {
  agentId: string;
  name: string;
  redacted: boolean;
  color: string;
};

type LeaderboardChartProps = {
  loading: boolean;
  error: string | null;
  chartData: Record<string, unknown>[];
  seriesMeta: SeriesMeta[];
  interval: IntervalOption;
  agents: LeaderboardAgent[];
  agentFilter: string;
  hiddenAgentIds: Set<string>;
  colorByAgentId: Map<string, string>;
  onClearFilter: () => void;
  onToggleAgent: (agentId: string) => void;
};

export function LeaderboardChart({
  loading,
  error,
  chartData,
  seriesMeta,
  interval,
  agents,
  agentFilter,
  hiddenAgentIds,
  colorByAgentId,
  onClearFilter,
  onToggleAgent,
}: LeaderboardChartProps) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-foreground">Top-10 equity curves (cumulative P&amp;L)</h2>
          <p className="text-xs text-muted-foreground">Computed from daily performance rollups.</p>
        </div>
        {agentFilter !== "all" ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs text-muted-foreground"
            onClick={onClearFilter}
          >
            Clear agent filter
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex h-[420px] items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="h-[420px] text-sm text-destructive">{error}</div>
      ) : chartData.length === 0 ? (
        <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
          No performance data yet.
        </div>
      ) : (
        <div className="h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="4 6" stroke="var(--chart-grid-stroke)" />
              <XAxis
                dataKey="bucket"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                minTickGap={16}
                tickFormatter={(value) => formatBucketLabel(String(value), interval)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value as number)}
              />
              <RechartsTooltip content={<LeaderboardTooltipContent interval={interval} />} />
              {seriesMeta.map((series) => (
                <Line
                  key={series.agentId}
                  type="linear"
                  dataKey={series.agentId}
                  name={series.redacted ? `${series.name} (redacted)` : series.name}
                  stroke={series.color}
                  strokeWidth={2}
                  strokeLinejoin="miter"
                  strokeLinecap="butt"
                  strokeMiterlimit={10}
                  dot={false}
                  activeDot={{ r: 4, fill: "hsl(var(--background))", stroke: series.color, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {agents.map((agent) => {
          const color = colorByAgentId.get(agent.id) ?? COLORS[0];
          const isVisible =
            agentFilter !== "all"
              ? agentFilter === agent.id
              : !hiddenAgentIds.has(agent.id);

          return (
            <button
              key={agent.id}
              type="button"
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition",
                isVisible
                  ? "border-border/40 bg-background/40 text-foreground hover:bg-background/60"
                  : "border-border/20 bg-transparent text-muted-foreground/70 hover:text-foreground",
              )}
              onClick={() => onToggleAgent(agent.id)}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="max-w-[220px] truncate">{agent.name}</span>
              {agent.redacted ? <span className="text-muted-foreground/70">(redacted)</span> : null}
            </button>
          );
        })}
      </div>
    </>
  );
}
