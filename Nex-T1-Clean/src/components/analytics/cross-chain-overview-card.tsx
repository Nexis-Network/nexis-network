"use client";

import { useMemo } from "react";
import { AlertTriangle, RefreshCcw, TrendingDown, TrendingUp, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketDataOverview } from "@/hooks/market";
import type { MarketDataAssetOverview } from "@/types/market";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const percentageFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

function getLatestValue(series?: { value: number }[]): number | undefined {
  if (!series || series.length === 0) {
    return undefined;
  }
  const latest = series[series.length - 1];
  return typeof latest?.value === "number" ? latest.value : undefined;
}

function getSentimentBadge(score?: number) {
  if (typeof score !== "number") {
    return { label: "Neutral", className: "border-border/60 text-muted-foreground" };
  }

  if (score >= 1) {
    return { label: "Bullish", className: "border-emerald-500/30 bg-[#8eb94f]/15 text-emerald-600" };
  }

  if (score <= -1) {
    return { label: "Bearish", className: "border-destructive/30 bg-destructive/15 text-destructive" };
  }

  return { label: "Neutral", className: "border-border/60 text-muted-foreground" };
}

type CrossChainOverviewCardProps = {
  assets?: string[];
  onClose?: () => void;
  enabled?: boolean;
};

export function CrossChainOverviewCard({ assets, onClose, enabled = true }: CrossChainOverviewCardProps) {
  const { data, isLoading, isError, refetch, error } = useMarketDataOverview({
    assets,
    enabled,
    staleTimeMs: 120_000,
    refetchIntervalMs: 180_000,
  });

  const cards = useMemo(() => {
    const overview = data?.data ?? [];
    return overview.map((asset) => buildAssetRow(asset));
  }, [data?.data]);
  const assetCount = assets && assets.length > 0 ? assets.length : 5;

  if (isError) {
    return (
      <Card className="border-destructive/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-regular">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Market Data Unavailable
            </CardTitle>
            <CardDescription>Unable to fetch Messari/Santiment/Token Metrics data.</CardDescription>
          </div>
          <Button onClick={() => refetch()} size="sm" variant="outline">
            <RefreshCcw className="mr-2 h-3.5 w-3.5" />Retry
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error?.message ?? "An unexpected error occurred."}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-background via-background/80 to-background/40 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <CardHeader className="flex flex-col gap-3 border-b border-border/40 bg-gradient-to-r from-primary/10 via-background/40 to-background px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div className="flex w-full items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-base font-regular text-foreground">Cross-chain Market Pulse</CardTitle>
            <CardDescription className="text-sm text-muted-foreground/90">
              Reconciled Messari metrics, Santiment sentiment, and Token Metrics AI grades updated every few minutes.
            </CardDescription>
          </div>
          {onClose ? (
            <Button
              aria-label="Dismiss market overview"
              onClick={onClose}
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Last updated:</span>
          <span className="font-medium text-foreground">{data?.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString() : "—"}</span>
          <Button onClick={() => refetch()} size="sm" variant="outline">
            <RefreshCcw className="mr-2 h-3.5 w-3.5" />Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5 py-4">
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: assetCount }).map((_, idx) => (
              <Skeleton key={idx} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.asset}
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-background/80 p-4 shadow-sm transition hover:border-primary/40 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                <div className="relative flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/80">{card.asset.toUpperCase()}</p>
                    <p className="text-2xl font-regular leading-none text-foreground">{card.price}</p>
                    <p className="text-xs text-muted-foreground/80">TVL {card.tvl} • Volume 24h {card.volume}</p>
                  </div>
                  <Badge variant="outline" className={`rounded-full border px-2 py-1 text-[11px] ${card.sentimentClassName}`}>
                    {card.sentimentLabel}
                  </Badge>
                </div>

                <div className="relative mt-4 space-y-2 text-sm text-muted-foreground">
                  <MetricLine label="Social Dominance" value={card.socialDominance} />
                  <MetricLine
                    label="Trader Grade"
                    value={card.traderGrade}
                    trend={card.traderTrend}
                    delta={card.traderDelta}
                  />
                </div>

                {card.errors.length ? (
                  <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{card.errors.join(" • ")}</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {data?.errors?.length ? (
          <div className="flex items-center gap-2 rounded-md border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            <span>{data.errors.join(" • ")}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function buildAssetRow(asset: MarketDataAssetOverview) {
  const latestSentiment = getLatestValue(asset.sentiment?.weightedSentiment);
  const sentimentBadge = getSentimentBadge(latestSentiment);

  const traderGrade = asset.tokenMetrics.traderGrade;
  const traderDelta = asset.tokenMetrics.traderDelta24h;
  const traderTrend: "up" | "down" | undefined =
    typeof traderDelta === "number" ? (traderDelta >= 0 ? "up" : "down") : undefined;
  const traderDeltaDisplay =
    typeof traderDelta === "number" && traderDelta !== 0 ? `${traderDelta > 0 ? "+" : ""}${numberFormatter.format(traderDelta)}` : undefined;

  const socialDominanceValue = getLatestValue(asset.sentiment?.socialDominance);

  return {
    asset: asset.asset,
    price: asset.metrics.priceUsd ? currencyFormatter.format(asset.metrics.priceUsd) : "–",
    volume: asset.metrics.volume24h ? currencyFormatter.format(asset.metrics.volume24h) : "–",
    tvl: asset.metrics.tvlUsd ? currencyFormatter.format(asset.metrics.tvlUsd) : "–",
    sentimentLabel: sentimentBadge.label,
    sentimentClassName: sentimentBadge.className,
    socialDominance:
      typeof socialDominanceValue === "number" ? percentageFormatter.format(socialDominanceValue) : "–",
    traderGrade: typeof traderGrade === "number" ? numberFormatter.format(traderGrade) : "–",
    traderTrend,
    traderDelta: traderDeltaDisplay,
    errors: asset.errors ?? [],
  };
}

function MetricLine({
  label,
  value,
  trend,
  delta,
}: {
  label: string;
  value: string;
  trend?: "up" | "down" | undefined;
  delta?: string;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;
  const tone = trend === "up" ? "text-[#8eb94f]" : trend === "down" ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/70 px-3 py-2">
      <span className="text-xs font-regular text-muted-foreground/90">{label}</span>
      <div className="flex flex-col items-end">
        <span className="text-sm font-regular text-foreground">{value}</span>
        {delta || TrendIcon ? (
          <span className={`flex items-center gap-1 text-[11px] ${tone}`}>
            {TrendIcon ? <TrendIcon className="h-3 w-3" /> : null}
            {delta ?? (trend === "up" ? "Improving" : trend === "down" ? "Cooling" : "")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
