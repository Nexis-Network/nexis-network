"use client";

import { useMemo, type ReactNode } from "react";

import { ExternalLink } from "lucide-react";

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
import { formatCurrency, formatNumber } from "@/modules/prices/market-overview/formatters";
import { useTrendingPools } from "@/hooks/market";

type PoolDrawerProps = {
  poolId: string | null;
  network?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PoolDrawer({ poolId, network, open, onOpenChange }: PoolDrawerProps) {
  const poolsQuery = useTrendingPools({ network, enabled: open });
  const pools = useMemo(() => poolsQuery.data?.data ?? [], [poolsQuery.data?.data]);

  const pool = useMemo(() => {
    if (!poolId) return undefined;
    return pools.find(
      (item) => item.poolAddress === poolId || item.id === poolId,
    );
  }, [pools, poolId]);

  const isLoading = poolsQuery.isLoading && !pool;

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="w-full max-w-xl border-l border-border/40">
        <DrawerHeader>
          {isLoading ? (
            <>
              <DrawerTitle className="sr-only">Loading pool details</DrawerTitle>
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-60" />
              </div>
            </>
          ) : pool ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="uppercase tracking-wide">
                  {pool.dex}
                </Badge>
                <Badge variant="secondary" className="uppercase tracking-wide">
                  {pool.network}
                </Badge>
              </div>
              <DrawerTitle className="text-lg font-regular">
                {pool.baseToken.symbol} / {pool.quoteToken.symbol}
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground">
                {pool.poolAddress}
              </DrawerDescription>
            </div>
          ) : (
            <DrawerTitle>Liquidity Pool</DrawerTitle>
          )}
        </DrawerHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : pool ? (
            <>
              <section className="grid gap-4 rounded-lg border border-border/40 bg-background/70 p-4 sm:grid-cols-2">
                <PoolStat label="Price">
                  {formatCurrency(pool.priceUsd ?? null, { compact: false })}
                </PoolStat>
                <PoolStat label="24h Volume">
                  {formatCurrency(pool.volume24hUsd ?? null, { compact: true })}
                </PoolStat>
                <PoolStat label="Liquidity">
                  {formatCurrency(pool.liquidityUsd ?? null, { compact: true })}
                </PoolStat>
                <PoolStat label="24h Transactions">
                  {formatNumber(pool.transactions24h ?? null, { compact: true })}
                </PoolStat>
              </section>

              <section className="grid gap-4 rounded-lg border border-border/40 bg-background/70 p-4">
                <div>
                  <h3 className="text-xs uppercase text-muted-foreground">
                    Base token
                  </h3>
                  <p className="text-sm font-medium text-foreground">
                    {pool.baseToken.name} ({pool.baseToken.symbol})
                  </p>
                </div>
                <div>
                  <h3 className="text-xs uppercase text-muted-foreground">
                    Quote token
                  </h3>
                  <p className="text-sm font-medium text-foreground">
                    {pool.quoteToken.name} ({pool.quoteToken.symbol})
                  </p>
                </div>
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>
                    <p className="uppercase">Base address</p>
                    <p className="truncate text-foreground">
                      {pool.baseToken.address ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase">Quote address</p>
                    <p className="truncate text-foreground">
                      {pool.quoteToken.address ?? "—"}
                    </p>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Unable to load pool details. Try selecting a different pool.
            </p>
          )}
        </div>

        <DrawerFooter className="flex items-center justify-between border-t border-border/30 bg-background/80">
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
          {pool?.url ? (
            <Button asChild variant="secondary">
              <a href={pool.url} target="_blank" rel="noreferrer">
                View on {pool.dex}
                <ExternalLink className="ml-2 size-4" />
              </a>
            </Button>
          ) : null}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

type PoolStatProps = {
  label: string;
  children: ReactNode;
};

function PoolStat({ label, children }: PoolStatProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{children}</p>
    </div>
  );
}
