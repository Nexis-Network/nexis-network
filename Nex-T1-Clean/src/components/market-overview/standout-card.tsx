"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/market-overview/sparkline";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercentage } from "@/modules/prices/market-overview/formatters";
import type { TopMover } from "@/types/market";

export function StandoutCard({ asset, onSelect }: { asset: TopMover; onSelect?: () => void }) {
  const tone = (asset.priceChangePercentage24h ?? 0) >= 0 ? "positive" : "negative";
  return (
    <button type="button" onClick={onSelect} className="w-full text-left">
      <Card className="border-border/40 bg-card/70 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">{asset.name}</p>
            <p className="text-xs uppercase text-muted-foreground">{asset.symbol}</p>
          </div>
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              tone === "positive" ? "bg-teal-600/10 text-teal-600 dark:text-teal-400" : "bg-red-600/10 text-red-600 dark:text-red-400",
            )}
          >
            {tone === "positive" ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {formatPercentage(asset.priceChangePercentage24h, { sign: true })}
          </span>
        </div>
        <p className="mt-2 text-xl font-mono font-normal text-foreground">{formatCurrency(asset.currentPrice, { currency: "usd" })}</p>
        <p className="text-xs text-muted-foreground">
          Vol <span className="font-mono font-normal">{formatCurrency(asset.totalVolume, { currency: "usd", compact: true })}</span>
        </p>
        <Sparkline values={asset.sparkline7d ?? []} tone={tone} className="mt-4 h-16" />
      </Card>
    </button>
  );
}
