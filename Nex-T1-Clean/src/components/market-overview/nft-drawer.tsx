"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { ExternalLink } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency, formatNumber } from "@/modules/prices/market-overview/formatters";
import { useNftDetails, useNftMarketChart } from "@/hooks/market";

type NftDrawerProps = {
  nftId: string | null;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const NFT_TIMEFRAMES: Array<{ value: string; label: string }> = [
  { value: "7", label: "7D" },
  { value: "30", label: "30D" },
  { value: "90", label: "90D" },
  { value: "180", label: "6M" },
];

const NFT_PRICE_CHART_CONFIG: ChartConfig = {
  price: {
    label: "Floor Price",
    color: "var(--chart-2)",
  },
};

export function NftDrawer({ nftId, currency, open, onOpenChange }: NftDrawerProps) {
  const [timeframe, setTimeframe] = useState<string>("30");

  useEffect(() => {
    if (!open) {
      setTimeframe("30");
    }
  }, [open]);

  const detailsQuery = useNftDetails(nftId ?? "", open && Boolean(nftId));
  const chartQuery = useNftMarketChart(
    nftId ?? "",
    { vsCurrency: currency, days: timeframe },
    open && Boolean(nftId),
  );

  const chartData = useMemo(
    () =>
      (chartQuery.data?.data?.prices ?? []).map(([timestamp, price]) => ({
        timestamp,
        price,
      })),
    [chartQuery.data?.data?.prices],
  );

  const details = detailsQuery.data?.data;

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="w-full max-w-xl border-l border-border/40">
        <DrawerHeader>
          {detailsQuery.isLoading ? (
            <>
              <DrawerTitle className="sr-only">Loading collection details</DrawerTitle>
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            </>
          ) : details ? (
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-border/40 bg-muted">
                {details.imageUrl ? (
                  <Image src={details.imageUrl} alt={details.name} fill sizes="48px" />
                ) : null}
              </div>
              <div className="flex flex-col gap-1">
                <DrawerTitle className="text-lg font-regular leading-tight">
                  {details.name}
                </DrawerTitle>
                <DrawerDescription className="text-xs uppercase text-muted-foreground">
                  {details.symbol}
                </DrawerDescription>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Badge variant="secondary">{currency.toUpperCase()}</Badge>
                {details.blockchains?.length ? (
                  <Badge variant="outline" className="capitalize">
                    {details.blockchains[0]}
                    {details.blockchains.length > 1 ? " +" : ""}
                  </Badge>
                ) : null}
              </div>
            </div>
          ) : (
            <DrawerTitle>NFT Collection</DrawerTitle>
          )}
        </DrawerHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6">
          <section className="space-y-4">
            {detailsQuery.isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : details ? (
              <div className="grid gap-4 rounded-lg border border-border/40 bg-background/70 p-4 sm:grid-cols-2">
                <Stat label="Floor (native)">
                  {formatNumber(details.floorPriceNative ?? null, {
                    compact: false,
                    maximumFractionDigits: 3,
                  })}
                </Stat>
                <Stat label={`Floor (${currency.toUpperCase()})`}>
                  {formatCurrency(details.floorPriceUsd ?? null, {
                    compact: false,
                    currency,
                  })}
                </Stat>
                <Stat label="24h Volume">
                  {formatCurrency(details.volume24hUsd ?? null, {
                    compact: true,
                    currency,
                  })}
                </Stat>
                <Stat label="Market Cap">
                  {formatCurrency(details.marketCapUsd ?? null, {
                    compact: true,
                    currency,
                  })}
                </Stat>
                <Stat label="Total Volume">
                  {formatCurrency(details.totalVolumeUsd ?? null, {
                    compact: true,
                    currency,
                  })}
                </Stat>
                <Stat label="Supply">
                  {formatNumber(details.numberOfTokens ?? null, {
                    compact: true,
                    maximumFractionDigits: 0,
                  })}
                </Stat>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Unable to load collection details.
              </p>
            )}
          </section>

          <OpenSeaStatsSection slug={details?.id ?? nftId ?? ""} enabled={open && Boolean(details?.id || nftId)} />

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Floor price history</h3>
              <ToggleGroup
                type="single"
                value={timeframe}
                onValueChange={(value) => value && setTimeframe(value)}
              >
                {NFT_TIMEFRAMES.map((item) => (
                  <ToggleGroupItem key={item.value} value={item.value}>
                    {item.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div className="h-64 w-full rounded-lg border border-border/40 bg-background/80">
              {chartQuery.isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Skeleton className="h-10 w-3/4" />
                </div>
              ) : chartData.length ? (
                <ChartContainer
                  config={NFT_PRICE_CHART_CONFIG}
                  className="aspect-auto h-full w-full"
                >
                  <LineChart
                    data={chartData}
                    margin={{ top: 16, right: 24, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="4 4"
                      stroke="hsl(var(--border) / 0.9)"
                    />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      dataKey="price"
                      tickFormatter={(value) =>
                        formatCurrency(value, { compact: true, currency })
                      }
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
                            new Date(Number(label)).toLocaleString()
                          }
                          formatter={(value, name) => {
                            const numericValue =
                              typeof value === "number" ? value : Number(value);
                            const formattedValue = Number.isFinite(numericValue)
                              ? formatCurrency(numericValue, {
                                compact: false,
                                currency,
                              })
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
                      name="Floor Price"
                      stroke="var(--color-price)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No chart data available.
                </div>
              )}
            </div>
          </section>

          {details?.description ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">About this collection</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {details.description}
              </p>
            </section>
          ) : null}
        </div>

        <DrawerFooter className="flex items-center justify-between border-t border-border/30 bg-background/80">
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
          {details?.homepageUrl ? (
            <Button asChild variant="secondary">
              <a href={details.homepageUrl} target="_blank" rel="noreferrer">
                Visit collection
                <ExternalLink className="ml-2 size-4" />
              </a>
            </Button>
          ) : null}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

type StatProps = {
  label: string;
  children: ReactNode;
};

function Stat({ label, children }: StatProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{children}</p>
    </div>
  );
}

import { useOpenSeaStats } from "@/lib/hooks/market/use-opensea";

function OpenSeaStatsSection({ slug, enabled }: { slug: string; enabled: boolean }) {
  const { data, isLoading } = useOpenSeaStats(slug, enabled);
  const stats = data?.data?.stats;

  if (isLoading) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-medium">OpenSea Stats</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </section>
    );
  }

  if (!stats) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">OpenSea Stats</h3>
      <div className="grid gap-4 rounded-lg border border-border/40 bg-background/70 p-4 sm:grid-cols-2">
        <Stat label="Floor Price">
          {formatCurrency(stats.floor_price, { currency: "eth", compact: false })} ETH
        </Stat>
        <Stat label="Total Volume">
          {formatCurrency(stats.total_volume, { currency: "eth", compact: true })} ETH
        </Stat>
        <Stat label="Total Sales">
          {formatNumber(stats.total_sales, { compact: true })}
        </Stat>
        <Stat label="Owners">
          {formatNumber(stats.num_owners, { compact: true })}
        </Stat>
        <Stat label="Avg Price">
          {formatCurrency(stats.average_price, { currency: "eth", compact: false })} ETH
        </Stat>
        <Stat label="Market Cap">
          {formatCurrency(stats.market_cap, { currency: "eth", compact: true })} ETH
        </Stat>
      </div>
    </section>
  );
}
