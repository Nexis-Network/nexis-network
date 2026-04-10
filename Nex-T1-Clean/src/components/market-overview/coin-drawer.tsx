"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency, formatNumber, formatPercentage } from "@/modules/prices/market-overview/formatters";
import { cn } from "@/lib/utils";
import { useCoinDetails, useCoinMarketChart, useCoinOhlc } from "@/hooks/market";

type CoinDrawerProps = {
  coinId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
};

const CHART_TIMEFRAMES = [
  { value: "1", label: "1D" },
  { value: "7", label: "7D" },
  { value: "30", label: "30D" },
  { value: "365", label: "1Y" },
];

const COIN_PRICE_CHART_CONFIG: ChartConfig = {
  price: {
    label: "Price",
    color: "var(--chart-2)",
  },
};

export function CoinDrawer({ coinId, open, onOpenChange, currency }: CoinDrawerProps) {
  const [timeframe, setTimeframe] = useState<string>("7");

  useEffect(() => {
    if (!open) {
      setTimeframe("7");
    }
  }, [open]);

  const detailsQuery = useCoinDetails(coinId ?? "", open && Boolean(coinId));
  const chartQuery = useCoinMarketChart(
    coinId ?? "",
    {
      vsCurrency: currency,
      days: timeframe,
    },
    open && Boolean(coinId),
  );
  const ohlcQuery = useCoinOhlc(
    coinId ?? "",
    {
      vsCurrency: currency,
      days: timeframe === "1" ? "1" : "7",
    },
    open && timeframe === "1" && Boolean(coinId),
  );

  const chartId = useId().replace(/:/g, "");

  const chartData = useMemo(() => {
    const prices = chartQuery.data?.data?.prices ?? [];
    return prices.map(([timestamp, price]) => ({
      timestamp,
      label: new Date(timestamp).toLocaleString(),
      price,
    }));
  }, [chartQuery.data?.data?.prices]);

  const ohlcData = ohlcQuery.data?.data ?? [];

  const details = detailsQuery.data?.data;

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="w-full max-w-2xl border-l border-border/40">
        <DrawerHeader>
          {detailsQuery.isLoading ? (
            <>
              <DrawerTitle className="sr-only">Loading asset details</DrawerTitle>
              <Skeleton className="h-6 w-32" />
            </>
          ) : details ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <DrawerTitle className="text-lg font-regular">
                  {details.name} <span className="text-sm uppercase text-muted-foreground">{details.symbol}</span>
                </DrawerTitle>
                <DrawerDescription>Live market performance and key stats</DrawerDescription>
              </div>
              <Badge variant="secondary">{currency.toUpperCase()}</Badge>
            </div>
          ) : (
            <DrawerTitle>Asset Details</DrawerTitle>
          )}
        </DrawerHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6">
          <section className="space-y-3">
            {detailsQuery.isLoading ? (
              <Skeleton className="h-10 w-40" />
            ) : details ? (
              <div className="flex flex-wrap items-end gap-4">
                <span className="text-3xl font-regular leading-none">
                  {formatCurrency(details.marketData.currentPriceUsd ?? null, { compact: false, currency })}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    (details.marketData.priceChangePercentage24h ?? 0) > 0
                      ? "text-emerald-400"
                      : (details.marketData.priceChangePercentage24h ?? 0) < 0
                        ? "text-red-400"
                        : "text-muted-foreground",
                  )}
                >
                  {formatPercentage(details.marketData.priceChangePercentage24h ?? null, { sign: true })} (24h)
                </span>
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <ToggleGroup type="single" value={timeframe} onValueChange={(value) => value && setTimeframe(value)}>
                {CHART_TIMEFRAMES.map((item) => (
                  <ToggleGroupItem key={item.value} value={item.value}>
                    {item.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <span className="text-xs text-muted-foreground">Sparkline powered by CoinGecko</span>
            </div>

            <div className="h-64 w-full rounded-lg border border-border/30 bg-background/60">
              {chartQuery.isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Skeleton className="h-10 w-3/4" />
                </div>
              ) : chartData.length ? (
                <ChartContainer
                  config={COIN_PRICE_CHART_CONFIG}
                  className="aspect-auto h-full w-full"
                >
                  <LineChart data={chartData} margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="4 4"
                      stroke="hsl(var(--border) / 0.9)"
                    />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) =>
                        timeframe === "1"
                          ? new Date(Number(value)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : new Date(Number(value)).toLocaleDateString()
                      }
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      dataKey="price"
                      tickFormatter={(value) => formatCurrency(value, { compact: true, currency })}
                      tickLine={false}
                      axisLine={false}
                      width={72}
                      style={{ fontSize: "12px" }}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) =>
                            new Date(Number(label)).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          }
                          formatter={(value, name) => {
                            const numericValue =
                              typeof value === "number" ? value : Number(value);
                            const formattedValue = Number.isFinite(numericValue)
                              ? formatCurrency(numericValue, { compact: false, currency })
                              : "—";

                            return (
                              <>
                                <div
                                  className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                  style={{ backgroundColor: "var(--color-price)" }}
                                />
                                <div className="flex flex-1 items-center justify-between leading-none">
                                  <span className="text-muted-foreground">{name}</span>
                                  <span className="text-foreground font-mono font-medium tabular-nums">
                                    {formattedValue}
                                  </span>
                                </div>
                              </>
                            );
                          }}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      name="Price"
                      stroke="var(--color-price)"
                      strokeWidth={2}
                      dot={false}
                      filter={`url(#${chartId}-glow)`}
                    />
                    <defs>
                      <filter id={`${chartId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="10" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No chart data available.
                </div>
              )}
            </div>

            {timeframe === "1" && ohlcQuery.data?.data?.length ? (
              <div className="rounded-lg border border-border/40 bg-background/70 p-4">
                <h3 className="text-sm font-medium">Intraday OHLC</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                  {(() => {
                    const latest = ohlcData[ohlcData.length - 1];
                    if (!latest) return null;
                    const [, open, high, low, close] = latest;
                    return (
                      <>
                        <div>
                          <p className="uppercase">Open</p>
                          <p className="text-sm font-medium text-foreground">
                            {formatCurrency(open, { compact: false, currency })}
                          </p>
                        </div>
                        <div>
                          <p className="uppercase">High</p>
                          <p className="text-sm font-medium text-foreground">
                            {formatCurrency(high, { compact: false, currency })}
                          </p>
                        </div>
                        <div>
                          <p className="uppercase">Low</p>
                          <p className="text-sm font-medium text-foreground">
                            {formatCurrency(low, { compact: false, currency })}
                          </p>
                        </div>
                        <div>
                          <p className="uppercase">Close</p>
                          <p className="text-sm font-medium text-foreground">
                            {formatCurrency(close, { compact: false, currency })}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : null}
          </section>

          <Separator />

          {details ? (
            <section className="grid gap-4 md:grid-cols-2">
              <StatCard label="Market Cap" value={formatCurrency(details.marketData.marketCapUsd ?? null, { compact: true, currency })} />
              <StatCard label="Fully Diluted Valuation" value={formatCurrency(details.marketData.fullyDilutedValuationUsd ?? null, { compact: true, currency })} />
              <StatCard label="24h Volume" value={formatCurrency(details.marketData.totalVolumeUsd ?? null, { compact: true, currency })} />
              <StatCard label="Circulating Supply" value={formatNumber(details.marketData.circulatingSupply ?? null, { compact: true, maximumFractionDigits: 2 })} />
              <StatCard label="Total Supply" value={formatNumber(details.marketData.totalSupply ?? null, { compact: true, maximumFractionDigits: 2 })} />
              <StatCard label="Max Supply" value={details.marketData.maxSupply ? formatNumber(details.marketData.maxSupply, { compact: true, maximumFractionDigits: 2 }) : "∞"} />
              <StatCard label="ATH" value={formatCurrency(details.marketData.athUsd ?? null, { compact: false, currency })} hint={details.marketData.athDate ? new Date(details.marketData.athDate).toLocaleDateString() : undefined} />
              <StatCard label="ATL" value={formatCurrency(details.marketData.atlUsd ?? null, { compact: false, currency })} hint={details.marketData.atlDate ? new Date(details.marketData.atlDate).toLocaleDateString() : undefined} />
            </section>
          ) : null}

          {details?.homepageUrls?.length ? (
            <section className="space-y-2">
              <h3 className="text-sm font-regular">Official Links</h3>
              <ul className="space-y-1 text-sm text-primary">
                {details.homepageUrls.filter(Boolean).slice(0, 3).map((url) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noreferrer" className="hover:underline">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/30 bg-background/60 p-3 text-sm">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-regular text-foreground">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
