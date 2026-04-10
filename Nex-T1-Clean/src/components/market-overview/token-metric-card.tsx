"use client";
import { useId, useMemo } from "react";
import Image from "next/image";
import { ArrowDownRight, ArrowUpRight, Minus, Plus } from "lucide-react";
import { Area, AreaChart, XAxis } from "recharts";

import { Card } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercentage } from "@/modules/prices/market-overview/formatters";
import { buildZoomedOutSparkline } from "@/modules/prices/market-overview/sparkline";

export type TokenMetric = {
  id: string;
  label: string;
  pair: string;
  price: number | null;
  delta: number | null;
  deltaValue: number | null;
  sparkline: number[];
  volume: number | null;
  segment: string;
  tone: "positive" | "negative" | "neutral";
  image?: string;
};

export type TokenMetricCardProps = {
  card: TokenMetric;
  currency: string;
  onSelect?: () => void;
  /** Set to true for above-fold cards to prioritize image loading for LCP */
  priority?: boolean;
  watchlistState?: {
    isWatched: boolean;
    isMutating: boolean;
    onAdd: () => void | Promise<void>;
    onRemove: () => void | Promise<void>;
  };
};

export function TokenMetricCard({ card, currency, onSelect, priority = false, watchlistState }: TokenMetricCardProps) {
  const tone = card.tone;
  const toneBg =
    tone === "positive"
      ? "bg-[#8eb94f]/10 text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
        : "bg-muted text-muted-foreground";
  const hasDeltaValue = typeof card.deltaValue === "number" && !Number.isNaN(card.deltaValue);
  const deltaValueSign = hasDeltaValue ? (card.deltaValue! > 0 ? "+" : card.deltaValue! < 0 ? "-" : "") : "";
  const deltaValueLabel = hasDeltaValue
    ? `${deltaValueSign}${formatCurrency(Math.abs(card.deltaValue ?? 0), {
      currency,
    })
    } `
    : "--";
  const chipColorClasses =
    tone === "positive"
      ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "border-rose-500/40 text-rose-600 dark:text-rose-400"
        : "border-border text-muted-foreground";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.();
        }
      }}
      className="relative h-[150px] min-w-[240px] snap-start text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
    >
      <Card className="relative h-full overflow-hidden border border-border bg-card/40 p-0 text-foreground backbackdrop-blur-lg">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-2.5 pt-2">
            <div className="flex items-center gap-2">
              {card.image ? (
                <div className="relative h-5 w-5 overflow-hidden rounded-full">
                  <Image 
                    src={card.image} 
                    alt={card.label} 
                    fill 
                    sizes="20px" 
                    className="object-cover" 
                    priority={priority}
                    loading={priority ? "eager" : "lazy"}
                  />
                </div>
              ) : null}
              <div className="text-sm font-medium tracking-[0.16px]">{card.label}</div>
              {watchlistState ? (
                <button
                  type="button"
                  aria-label={watchlistState.isWatched ? "Remove from watchlist" : "Add to watchlist"}
                  className={cn(
                    "flex size-[25px] items-center justify-center rounded-full border border-border/50 bg-transparent text-foreground/70 transition hover:text-[#31B8C6] dark:border-white/15 dark:text-white",
                    watchlistState.isMutating ? "opacity-40" : "",
                  )}
                  disabled={watchlistState.isMutating}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (watchlistState.isMutating) {
                      return;
                    }
                    if (watchlistState.isWatched) {
                      void watchlistState.onRemove();
                    } else {
                      void watchlistState.onAdd();
                    }
                  }}
                >
                  {watchlistState.isWatched ? <Minus className="size-[12.5px]" /> : <Plus className="size-[12.5px]" />}
                </button>
              ) : null}
            </div>
            <div className={cn("flex items-center gap-2 rounded-md bg-transparent px-1.5 py-0.5 text-[11px] font-medium", toneBg)}>
              <div className="relative h-[16px] w-[16px] rotate-45 rounded-[4px] bg-transparent">
                {tone === "positive" ? (
                  <ArrowUpRight className="absolute left-[2px] top-[2px] size-[10px] -rotate-45 text-[#31B8C6]" />
                ) : tone === "negative" ? (
                  <ArrowDownRight className="absolute left-[2px] top-[2px] size-[10px] -rotate-45 text-[#FF5459]" />
                ) : null}
              </div>
              <span>{formatPercentage(card.delta, { sign: true })}</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-2.5 pt-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">{card.pair}</span>
              <span className="text-xs">· {card.segment}</span>
            </div>
            <div className={cn("flex items-center gap-1 rounded-sm px-[6px] py-[2px] text-[10px]", chipColorClasses)}>
              <span>{deltaValueLabel}</span>
            </div>
          </div>
          <TokenSparkline values={card.sparkline} tone={tone} />
          <div className="mt-auto flex items-center justify-between border-t border-border px-2.5 pb-2 pt-1">
            <div className="text-[12px] font-medium">{formatCurrency(card.price, { currency })}</div>
            <div className="text-[11px] text-muted-foreground">
              Vol 24h · {formatCurrency(card.volume, { currency, compact: true })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

type TokenSparklineProps = {
  values: number[];
  tone: "positive" | "negative" | "neutral";
};

function TokenSparkline({ values, tone }: TokenSparklineProps) {
  const stroke =
    tone === "positive" ? "#38bdf8" : tone === "negative" ? "#f43f5e" : "hsl(var(--muted-foreground))";
  const data = useMemo(() => {
    const zoomedValues = buildZoomedOutSparkline(values);
    return zoomedValues.map((value, index) => ({ index, value }));
  }, [values]);
  const gradientId = useId().replace(/:/g, "");

  if (!data.length) {
    return <div className="mt-2 h-[48px]" />;
  }

  return (
    <div className="relative mt-2 h-[52px] w-full px-2">
      <ChartContainer
        config={{ value: { label: "Price", color: stroke } }}
        className="relative h-full w-full"
      >
        <AreaChart data={data} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.18} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="index" hide />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            fillOpacity={1}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
