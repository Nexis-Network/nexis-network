"use client";

import { BarChart3, Activity, ArrowUpRight, Radar } from "lucide-react";
import { useCallback, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OPEN_ARTIFACT_PANEL_EVENT } from "@/lib/ai/artifact-runtime";
import {
  MarketTerminalArtifactSchema,
  createMarketTerminalArtifactPayload,
  type MarketTerminalArtifactPayload,
} from "@/modules/shared/artifacts/market-terminal";

type MarketTerminalArtifactCardProps = {
  data: UntypedJson;
};

function getArtifactData(data: UntypedJson): MarketTerminalArtifactPayload {
  const parsed = MarketTerminalArtifactSchema.safeParse(data);
  if (parsed.success) {
    return parsed.data;
  }

  return createMarketTerminalArtifactPayload({
    title: "Market Terminal",
  });
}

export function MarketTerminalArtifactCard({
  data,
}: MarketTerminalArtifactCardProps) {
  const artifact = useMemo(() => getArtifactData(data), [data]);

  const handleOpen = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_ARTIFACT_PANEL_EVENT));
  }, []);

  const viewLabel =
    artifact.initialView === "trade-tape"
      ? "Trade tape"
      : artifact.initialView === "pivot"
        ? "Pivot"
        : artifact.initialView === "review"
          ? "Review"
          : "Screener";

  return (
    <div className="my-4 max-w-xl rounded-2xl border border-border/70 bg-[linear-gradient(135deg,rgba(17,24,39,0.96),rgba(11,18,32,0.88))] p-4 text-foreground shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-200">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{artifact.title}</p>
              <p className="text-xs text-muted-foreground">
                {artifact.query || "Top crypto assets"} on {artifact.chain}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{artifact.universe}</Badge>
            <Badge variant="outline">{viewLabel}</Badge>
            <Badge variant="outline">
              {artifact.quoteCurrency.toUpperCase()}
            </Badge>
          </div>
        </div>
        <Button size="sm" onClick={handleOpen}>
          Open terminal
          <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-background/20 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Radar className="h-3.5 w-3.5" />
            Selected assets
          </div>
          <div className="mt-2 text-sm font-medium">
            {artifact.selectedAssetIds.length}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/20 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            Tracked pools
          </div>
          <div className="mt-2 text-sm font-medium">
            {artifact.selectedPools.length}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/20 p-3">
          <div className="text-xs text-muted-foreground">Agent actions</div>
          <div className="mt-2 text-sm font-medium">
            {[
              artifact.actions.canAnalyze ? "Analyze" : null,
              artifact.actions.canWatchlist ? "Watchlist" : null,
              artifact.actions.canSwap ? "Swap" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
      </div>
    </div>
  );
}
