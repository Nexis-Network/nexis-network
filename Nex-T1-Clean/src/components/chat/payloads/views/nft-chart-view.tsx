"use client";

import Image from "next/image";

import { useMemo } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import type { NftChartPayload } from "@/components/chat/types";

const nftChartConfig: ChartConfig = {
  price: {
    label: "Floor (USD)",
    color: "hsl(var(--chart-2))",
  },
};

export function NftChartPayloadView({ payload }: { payload: NftChartPayload }) {
  const points = useMemo(() => {
    const raw = payload.chart?.prices ?? [];
    return raw
      .map(([timestamp, price]: [number, number]) => ({ timestamp, price }))
      .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.price));
  }, [payload.chart?.prices]);

  const formatUsdCompact = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) return "—";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `$${value.toFixed(2)}`;
    }
  };

  const floorLabel = payload.floorPriceUsd != null ? formatUsdCompact(payload.floorPriceUsd) : "—";
  const floorChangeLabel =
    payload.floorPriceChangePct24h != null && Number.isFinite(payload.floorPriceChangePct24h)
      ? `${payload.floorPriceChangePct24h.toFixed(2)}%`
      : "—";

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border/40 bg-background/60 p-3">
      <div className="flex items-start gap-3">
        {payload.imageUrl ? (
          <Image
            src={payload.imageUrl}
            alt={payload.name}
            width={36}
            height={36}
            className="rounded-full border border-border/40 bg-background/80 object-contain"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium text-foreground">
            {payload.name} <span className="text-muted-foreground">({payload.symbol.toUpperCase()})</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Floor: <span className="font-medium text-foreground">{floorLabel}</span> · 24h Δ{" "}
            <span className="font-medium text-foreground">{floorChangeLabel}</span>
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {payload.marketCapUsd != null ? <span>Market cap: {formatUsdCompact(payload.marketCapUsd)}</span> : null}
            {payload.volume24hUsd != null ? <span>24h volume: {formatUsdCompact(payload.volume24hUsd)}</span> : null}
            {payload.transactions24h != null ? <span>24h sales: {payload.transactions24h}</span> : null}
            {payload.lastUpdated ? <span>Updated: {new Date(payload.lastUpdated).toLocaleString()}</span> : null}
          </div>
        </div>
      </div>

      {payload.summary ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{payload.summary}</p>
      ) : null}

      {payload.error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {payload.error}
        </div>
      ) : points.length ? (
        <div className="rounded-lg border border-border/40 bg-background/70 p-2">
          <ChartContainer
            config={nftChartConfig}
            className="h-[260px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground"
          >
            <LineChart data={points} margin={{ top: 12, right: 12, bottom: 8, left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.35} />
              <XAxis
                dataKey="timestamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={40}
                tickFormatter={(value) => {
                  const date = new Date(Number(value));
                  return Number.isFinite(date.getTime())
                    ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
                    : "";
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={64}
                tickFormatter={(value) => formatUsdCompact(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className="w-[200px]"
                    labelFormatter={(value) => new Date(Number(value)).toLocaleString()}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={`var(--color-price, ${nftChartConfig.price.color})`}
                strokeWidth={2.25}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        </div>
      ) : (
        <div className="rounded-lg border border-border/40 bg-background/70 p-2">
          <Skeleton className="h-[260px] w-full" />
        </div>
      )}
    </div>
  );
}
