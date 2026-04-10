"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { CoingeckoChartPayload } from "@/components/chat/types";

const coingeckoChartConfig: ChartConfig = {
  price: {
    label: "Price",
    color: "hsl(var(--chart-2))",
  },
};

type ChartPoint = {
  timestamp: number;
  dateLabel: string;
  price: number;
};

const MAX_POINTS = 480;

const downsample = (points: ChartPoint[]): ChartPoint[] => {
  if (points.length <= MAX_POINTS) return points;
  const step = Math.ceil(points.length / MAX_POINTS);
  const sampled: ChartPoint[] = [];
  for (let index = 0; index < points.length; index += step) {
    sampled.push(points[index]);
  }
  if (sampled[sampled.length - 1]?.timestamp !== points[points.length - 1]?.timestamp) {
    sampled.push(points[points.length - 1]);
  }
  return sampled;
};

const formatCurrency = (value: number | null | undefined, currency = "usd") => {
  if (value == null || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 4,
    }).format(value);
  } catch {
    return `${currency.toUpperCase()} ${value.toFixed(4)}`;
  }
};

export function CoingeckoChartPayloadView({ payload }: { payload: CoingeckoChartPayload }) {
  const currency = (payload.vsCurrency ?? "usd").toLowerCase();
  const points = useMemo(() => {
    const raw = payload.chart?.prices ?? [];
    const normalized = raw
      .map(([timestamp, price]) => ({
        timestamp,
        price,
        dateLabel: new Date(timestamp).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      }))
      .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.price));

    return downsample(normalized);
  }, [payload.chart?.prices]);

  if (payload.error && points.length === 0) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {payload.error}
      </div>
    );
  }

  if (points.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-background/60 p-4">
      <div className="flex items-center gap-3">
        {payload.imageUrl ? (
          <Image
            src={payload.imageUrl}
            alt={`${payload.name} logo`}
            width={28}
            height={28}
            className="h-7 w-7 rounded-full object-contain"
            unoptimized
          />
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {payload.name} ({payload.symbol.toUpperCase()})
          </p>
          <p className="text-xs text-muted-foreground">
            Source: CoinGecko
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <Metric label="Price" value={formatCurrency(payload.currentPriceUsd, currency)} />
        <Metric
          label="24h"
          value={payload.priceChange24hPct == null ? "—" : `${payload.priceChange24hPct.toFixed(2)}%`}
        />
        <Metric label="Market Cap" value={formatCurrency(payload.marketCapUsd, currency)} />
        <Metric label="Volume 24h" value={formatCurrency(payload.volume24hUsd, currency)} />
      </div>

      <ChartContainer config={coingeckoChartConfig} className="h-[260px] w-full">
        <LineChart data={points} margin={{ top: 10, right: 12, left: 4, bottom: 2 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={54}
            tickFormatter={(value) => (typeof value === "number" ? value.toFixed(2) : String(value))}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" />}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={`var(--color-price, ${coingeckoChartConfig.price.color})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/30 bg-background/40 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

