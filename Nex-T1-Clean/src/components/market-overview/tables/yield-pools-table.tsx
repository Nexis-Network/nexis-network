"use client";

import Image from "next/image";
import { memo, useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PaginatedGridTable } from "@/components/market-overview/tables/paginated-grid-table";
import { getDeltaColorClass } from "@/components/market-overview/data-table";
import { formatCurrency, formatPercentage } from "@/modules/prices/market-overview/formatters";
import type { DefiLlamaYieldPool } from "@/types/market";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/hooks/ui/use-media-query";

const ADDRESS_VISIBLE_CHARS = 5;
const ADDRESS_REGEX = /0x[a-fA-F0-9]{10,}/;

export function YieldPoolsTable({ pools, isLoading, isError }: { pools: DefiLlamaYieldPool[]; isLoading: boolean; isError: boolean }) {
  const isMdUp = useMediaQuery("(min-width: 768px)");
  const rows = useMemo(() => pools.slice(0, 100), [pools]);

  const columns = useMemo(() => {
    const poolColumn = { key: "pool", header: "Pool", width: "minmax(0, 2.2fr)", render: (pool: DefiLlamaYieldPool) => <YieldPoolInfo pool={pool} /> };

    if (!isMdUp) {
      return [
        poolColumn,
        {
          key: "stats",
          header: "Stats",
          width: "minmax(0, 1.5fr)",
          align: "right" as const,
          render: (pool: DefiLlamaYieldPool) => (
            <div className="flex flex-col items-end gap-1 leading-tight">
              <span className={cn("text-sm font-mono font-normal", getDeltaColorClass(pool.apy))}>
                {formatPercentage(pool.apy, { maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-muted-foreground">
                TVL <span className="font-mono font-normal">{formatCurrency(pool.tvlUsd, { currency: "usd", compact: true })}</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                {pool.predictions?.predictedClass ?? "Unscored"}
                {pool.predictions?.predictedProbability != null ? <span className="font-mono font-normal">{" · "}{(pool.predictions.predictedProbability * 100).toFixed(0)}%</span> : ""}
              </span>
            </div>
          ),
        },
      ];
    }

    return [
      poolColumn,
      {
        key: "chain",
        header: "Chain · TVL",
        width: "minmax(0, 1.4fr)",
        render: (pool: DefiLlamaYieldPool) => (
          <div className="flex min-w-0 flex-col text-[11px] text-muted-foreground">
            <span className="truncate text-sm font-medium text-foreground">{pool.chain}</span>
            <span>TVL · <span className="font-mono font-normal">{formatCurrency(pool.tvlUsd, { currency: "usd", compact: true })}</span></span>
          </div>
        ),
      },
      {
        key: "apy",
        header: "APY",
        width: "minmax(0, 1.1fr)",
        render: (pool: DefiLlamaYieldPool) => (
          <span className={cn("text-sm font-mono font-normal", getDeltaColorClass(pool.apy))}>
            {formatPercentage(pool.apy, { maximumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: "signal",
        header: "Signal",
        width: "minmax(0, 1.6fr)",
        render: (pool: DefiLlamaYieldPool) => (
          <PredictionBadge
            label={pool.predictions?.predictedClass ?? "Unscored"}
            probability={pool.predictions?.predictedProbability != null ? pool.predictions.predictedProbability * 100 : null}
          />
        ),
      },
      {
        key: "rewards",
        header: "Rewards",
        width: "minmax(0, 1.2fr)",
        render: (pool: DefiLlamaYieldPool) => {
          const rewardLabel = pool.rewardTokens.length ? pool.rewardTokens.join(" · ") : "—";
          return <span className="truncate text-[11px] text-muted-foreground">{rewardLabel}</span>;
        },
      },
    ];
  }, [isMdUp]);

  return (
    <PaginatedGridTable<DefiLlamaYieldPool>
      rows={rows}
      isLoading={isLoading}
      isError={isError}
      dataLabel="DeFi yield pools"
      emptyMessage="No pools available."
      errorMessage="Unable to load DeFi yield pools right now."
      minWidthPx={920}
      columns={columns}
    />
  );
}

const YieldPoolInfo = memo(function YieldPoolInfo({ pool }: { pool: DefiLlamaYieldPool }) {
  const underlyingLabel = getUnderlyingTokenLabel(pool);
  const contractAddress = getPoolContractAddress(pool);
  const fallbackText = useMemo(() => (pool.symbol ?? pool.project).slice(0, 2).toUpperCase(), [pool.symbol, pool.project]);
  const [logoError, setLogoError] = useState(false);
  const content = (
    <div className="flex items-center gap-3">
      <Avatar className="size-9 shrink-0 border border-border bg-muted text-xs font-semibold uppercase tracking-[0.16px] text-foreground">
        {pool.logo && !logoError ? (
          <Image
            src={pool.logo}
            alt={pool.project}
            width={36}
            height={36}
            className="h-full w-full object-cover object-center"
            unoptimized
            onError={() => setLogoError(true)}
          />
        ) : null}
        <AvatarFallback>{fallbackText}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col leading-tight">
        <span className="text-[14px] font-medium tracking-[0.16px] text-foreground">{pool.project}</span>
        <span className="text-[11px] uppercase tracking-[0.16px] text-muted-foreground">{underlyingLabel ?? "—"}</span>
        {contractAddress ? <ContractAddressBadge address={contractAddress} /> : null}
      </div>
    </div>
  );
  return pool.link ? (
    <a href={pool.link} target="_blank" rel="noopener noreferrer" className="block">
      {content}
    </a>
  ) : (
    content
  );
});

function getUnderlyingTokenLabel(pool: DefiLlamaYieldPool) {
  if (pool.symbol) return pool.symbol;
  if (pool.project) return pool.project;
  const match = ADDRESS_REGEX.exec(pool.poolAddress ?? "");
  if (match) {
    const addr = match[0];
    return `${addr.slice(0, ADDRESS_VISIBLE_CHARS + 2)}…${addr.slice(-ADDRESS_VISIBLE_CHARS)}`;
  }
  return null;
}

function getPoolContractAddress(pool: DefiLlamaYieldPool) {
  if (pool.pool ?? pool.poolAddress) {
    return pool.pool ?? pool.poolAddress;
  }
  if (pool?.lpToken?.address) {
    return pool.lpToken.address;
  }
  return null;
}

function ContractAddressBadge({ address }: { address: string }) {
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-md border border-border/50 bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.16px] text-muted-foreground">
      {address.slice(0, ADDRESS_VISIBLE_CHARS + 2)}…{address.slice(-ADDRESS_VISIBLE_CHARS)}
    </span>
  );
}

function PredictionBadge({ label, probability }: { label: string; probability: number | null }) {
  const tone = probability == null ? "text-muted-foreground" : probability >= 70 ? "text-emerald-400" : probability >= 40 ? "text-amber-400" : "text-red-400";
  return (
    <span className={cn("text-sm font-mono font-normal", tone)}>
      {label} {probability != null ? `(${probability.toFixed(1)}%)` : ""}
    </span>
  );
}
