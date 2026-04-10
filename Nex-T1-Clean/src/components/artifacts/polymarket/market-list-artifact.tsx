"use client";

import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactActions,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Clock, Droplets, TrendingUp } from "lucide-react";
import { formatCompactUsd, formatDate, safeNum } from "./utils";

interface MarketOutcome {
  name: string;
  tokenId: string;
  /** Price as string from API (0-1 range, e.g. "0.52") */
  price: string;
}

interface MarketItem {
  conditionId: string;
  question: string;
  slug: string;
  outcomes: MarketOutcome[];
  /** Volume as string from API (e.g. "1234567") */
  volume: string;
  /** Liquidity as string from API */
  liquidity: string;
  endDate?: string;
  negRisk: boolean;
}

export interface MarketListArtifactData {
  markets: MarketItem[];
  total: number;
  hasMore: boolean;
}

export function MarketListArtifact({ data }: { data: MarketListArtifactData }) {
  if (!data.markets || data.markets.length === 0) {
    return (
      <Artifact className="space-y-0">
        <ArtifactHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-violet-500" />
            <ArtifactTitle>Prediction Markets</ArtifactTitle>
          </div>
        </ArtifactHeader>
        <ArtifactContent>
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No markets found
          </div>
        </ArtifactContent>
      </Artifact>
    );
  }

  return (
    <Artifact className="space-y-0 w-full max-w-full">
      <ArtifactHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-violet-500" />
          <ArtifactTitle>Prediction Markets</ArtifactTitle>
        </div>
        <ArtifactActions>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-background/50">
            {data.total} Market{data.total !== 1 ? "s" : ""}
          </Badge>
        </ArtifactActions>
      </ArtifactHeader>

      <ArtifactContent className="space-y-3">
        {data.markets.map((market) => {
          const yesOutcome = market.outcomes.find((o) => o.name.toLowerCase() === "yes");
          const noOutcome = market.outcomes.find((o) => o.name.toLowerCase() === "no");
          const yesPct = Math.round(safeNum(yesOutcome?.price) * 100);
          const noPct = Math.round(safeNum(noOutcome?.price) * 100);

          return (
            <div
              key={market.conditionId}
              className="rounded-lg border border-border/40 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="text-sm font-medium text-foreground leading-snug flex-1">
                  {market.question}
                </p>
                {market.negRisk && (
                  <Badge variant="outline" className="text-[9px] shrink-0 border-amber-500/30 text-amber-500 bg-amber-500/5">
                    NEG RISK
                  </Badge>
                )}
              </div>

              {/* Outcome probability bar */}
              <div className="flex h-6 w-full rounded-md overflow-hidden mb-3" role="img" aria-label={`Yes: ${yesPct}%, No: ${noPct}%`}>
                <div
                  className="flex items-center justify-center text-[10px] font-bold text-white bg-emerald-600 transition-all"
                  style={{ width: `${Math.max(yesPct, 5)}%` }}
                >
                  {yesPct > 10 && `Yes ${yesPct}%`}
                </div>
                <div
                  className="flex items-center justify-center text-[10px] font-bold text-white bg-red-600 transition-all"
                  style={{ width: `${Math.max(noPct, 5)}%` }}
                >
                  {noPct > 10 && `No ${noPct}%`}
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="size-3" aria-hidden />
                  {formatCompactUsd(market.volume)}
                </span>
                <span className="flex items-center gap-1">
                  <Droplets className="size-3" aria-hidden />
                  {formatCompactUsd(market.liquidity)}
                </span>
                {market.endDate && (
                  <span className="flex items-center gap-1 ml-auto">
                    <Clock className="size-3" aria-hidden />
                    {formatDate(market.endDate)}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {data.hasMore && (
          <p className="text-center text-xs text-muted-foreground pt-2">
            Showing {data.markets.length} of {data.total} markets
          </p>
        )}
      </ArtifactContent>
    </Artifact>
  );
}
