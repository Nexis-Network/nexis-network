"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentPerformanceChart } from "@/components/agents/agent-performance-chart";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type RangeOption = "7d" | "30d" | "90d";

type SeriesPoint = {
  bucket: string;
  pnl_usd: string;
  trades: number;
};

type AgentPerformancePanelProps = {
  agentId: string;
};

export function AgentPerformancePanel({ agentId }: AgentPerformancePanelProps) {
  const [range, setRange] = useState<RangeOption>("30d");
  const [data, setData] = useState<SeriesPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/agents/${agentId}/performance?range=${range}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const payload = await response.json();
        if (cancelled) return;
        setData(Array.isArray(payload.series) ? payload.series : []);
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load performance");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [agentId, range]);

  const chartData = useMemo(
    () =>
      data.map((point) => ({
        bucket: point.bucket,
        pnlUsd: Number(point.pnl_usd ?? 0),
        trades: Number(point.trades ?? 0),
      })),
    [data],
  );

  return (
    <Card className="border-white/10 bg-white/[0.02]">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base text-white">Performance</CardTitle>
          <p className="text-xs text-muted-foreground/70">Realized P&L over time</p>
        </div>
        <div className="flex items-center gap-2">
          {(["7d", "30d", "90d"] as RangeOption[]).map((option) => (
            <Button
              key={option}
              variant={range === option ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-8 px-3 text-xs", range === option ? "text-white" : "text-muted-foreground")}
              onClick={() => setRange(option)}
            >
              {option.toUpperCase()}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="h-64 text-sm text-destructive">{error}</div>
        ) : chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground/70">
            No trade history available yet.
          </div>
        ) : (
          <AgentPerformanceChart data={chartData} />
        )}
      </CardContent>
    </Card>
  );
}
