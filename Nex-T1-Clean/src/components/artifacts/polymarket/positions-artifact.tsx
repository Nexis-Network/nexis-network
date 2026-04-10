"use client";

import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactActions,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserPosition {
  market: string;
  outcome: string;
  size: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
}

export interface PositionsArtifactData {
  positions: UserPosition[];
  totalValue: number;
  unrealizedPnl: number;
}

function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function PositionsArtifact({ data }: { data: PositionsArtifactData }) {
  if (!data.positions || data.positions.length === 0) {
    return (
      <Artifact className="space-y-0">
        <ArtifactHeader>
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-sky-500" />
            <ArtifactTitle>Positions</ArtifactTitle>
          </div>
        </ArtifactHeader>
        <ArtifactContent>
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No open positions
          </div>
        </ArtifactContent>
      </Artifact>
    );
  }

  const pnlPositive = data.unrealizedPnl >= 0;

  return (
    <Artifact className="space-y-0 w-full max-w-full">
      <ArtifactHeader>
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-sky-500" />
          <ArtifactTitle>Positions</ArtifactTitle>
        </div>
        <ArtifactActions>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-background/50">
            {data.positions.length} Position{data.positions.length !== 1 ? "s" : ""}
          </Badge>
        </ArtifactActions>
      </ArtifactHeader>

      <ArtifactContent className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-card/30 border border-border/40">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Total Value</p>
            <p className="text-xl font-bold tracking-tight text-foreground">{fmtUsd(data.totalValue)}</p>
          </div>
          <div className="p-4 rounded-xl bg-card/30 border border-border/40">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Unrealized P&L</p>
            <p className={cn("text-xl font-bold tracking-tight", pnlPositive ? "text-emerald-500" : "text-red-500")}>
              {pnlPositive ? "+" : ""}{fmtUsd(data.unrealizedPnl)}
            </p>
          </div>
        </div>

        {/* Positions table */}
        <div className="space-y-2">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            <span className="col-span-4">Market</span>
            <span className="col-span-2 text-right">Size</span>
            <span className="col-span-3 text-right">Price</span>
            <span className="col-span-3 text-right">P&L</span>
          </div>

          {data.positions.map((pos) => {
            const positive = pos.pnl >= 0;
            return (
              <div
                key={`${pos.market}-${pos.outcome}`}
                className="grid grid-cols-12 gap-2 items-center rounded-lg border border-border/40 bg-white/[0.02] hover:bg-white/[0.04] transition-colors px-3 py-2.5"
              >
                <div className="col-span-4 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{pos.market}</p>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[9px] mt-1 h-4 px-1.5",
                      pos.outcome.toLowerCase() === "yes"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-red-500/10 text-red-500"
                    )}
                  >
                    {pos.outcome}
                  </Badge>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-xs font-mono text-foreground">{pos.size.toLocaleString()}</span>
                </div>
                <div className="col-span-3 text-right space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">
                    Avg {(pos.avgPrice * 100).toFixed(1)}c
                  </p>
                  <p className="text-xs font-mono text-foreground">
                    {(pos.currentPrice * 100).toFixed(1)}c
                  </p>
                </div>
                <div className="col-span-3 text-right">
                  <div className={cn("flex items-center justify-end gap-1 text-xs font-bold", positive ? "text-emerald-500" : "text-red-500")}>
                    {positive ? <TrendingUp className="size-3" aria-hidden /> : <TrendingDown className="size-3" aria-hidden />}
                    <span className="sr-only">{positive ? "Profit" : "Loss"}</span>
                    {fmtUsd(pos.pnl)}
                  </div>
                  <p className={cn("text-[10px]", positive ? "text-emerald-500/70" : "text-red-500/70")}>
                    {fmtPct(pos.pnlPct)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ArtifactContent>
    </Artifact>
  );
}
