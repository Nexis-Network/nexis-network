"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { Search } from "lucide-react";

import { DataTableWrapper, TableEmptyState, TableSkeleton } from "@/components/market-overview/data-table";
import { useDexNewPairs, usePumpfunNewTokens } from "@/hooks/market/use-market-overview";
import { formatCurrency, formatRelativeTime } from "@/modules/prices/market-overview/formatters";
import type { DexPairSummary, PumpfunNewToken } from "@/types/market";
import { cn } from "@/lib/utils";

const NEW_PAIRS_TEMPLATE = "minmax(220px,2fr) minmax(140px,1fr) minmax(120px,1fr) minmax(120px,1fr) minmax(130px,1fr) minmax(120px,1fr)";
const PUMPFUN_TEMPLATE = "minmax(240px,2.2fr) minmax(130px,1fr) minmax(130px,1fr) minmax(130px,1fr) minmax(120px,1fr)";
const EMPTY_PAIRS: DexPairSummary[] = [];
const EMPTY_PUMPFUN: PumpfunNewToken[] = [];
const PAGE_SIZE = 10;

export function DexRadarCard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"evm" | "pumpfun">("evm");

  const newPairsQuery = useDexNewPairs({ limit: 30, enabled: view === "evm" });
  const pumpfunQuery = usePumpfunNewTokens({ limit: 30, network: "mainnet", enabled: view === "pumpfun" });

  const pairs = newPairsQuery.data?.data ?? EMPTY_PAIRS;
  const pumpTokens = pumpfunQuery.data?.data?.items ?? EMPTY_PUMPFUN;

  const isError = view === "evm" ? newPairsQuery.isError : pumpfunQuery.isError;
  const isLoading =
    view === "evm"
      ? newPairsQuery.isLoading && pairs.length === 0
      : pumpfunQuery.isLoading && pumpTokens.length === 0;

  const deferredSearch = useDeferredValue(searchTerm);

  const filteredPools = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    if (!term) {
      return view === "evm" ? pairs : pumpTokens;
    }
    if (view === "evm") {
      return pairs.filter((pair) => {
        const haystack = [
          pair.baseToken?.symbol,
          pair.baseToken?.name,
          pair.quoteToken?.symbol,
          pair.quoteToken?.name,
          pair.dexName,
          pair.dexId,
          pair.network,
          pair.chainId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      });
    }

    return pumpTokens.filter((token) => {
      const haystack = [token.symbol, token.name, token.address].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [deferredSearch, pairs, pumpTokens, view]);

  const sortedPairs = useMemo(
    () =>
      filteredPools
        .slice()
        .sort((a, b) => {
          if (view === "evm") {
            const aTime = (a as DexPairSummary).pairCreatedAt ? Date.parse((a as DexPairSummary).pairCreatedAt!) : 0;
            const bTime = (b as DexPairSummary).pairCreatedAt ? Date.parse((b as DexPairSummary).pairCreatedAt!) : 0;
            return bTime - aTime;
          }
          const aTime = (a as PumpfunNewToken).createdAt ? Date.parse((a as PumpfunNewToken).createdAt!) : 0;
          const bTime = (b as PumpfunNewToken).createdAt ? Date.parse((b as PumpfunNewToken).createdAt!) : 0;
          return bTime - aTime;
        }),
    [filteredPools, view],
  );
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(sortedPairs.length / PAGE_SIZE));
  const rows = useMemo(() => sortedPairs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sortedPairs, page]);
  const showEmpty = !isLoading && sortedPairs.length === 0;

  useEffect(() => setPage(1), [sortedPairs.length]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16px] text-muted-foreground">on-chain discovery</p>
          <h2 className="text-lg font-medium text-foreground">{view === "evm" ? "New pairs" : "Pump.fun new tokens"}</h2>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            className="w-full rounded-full border border-border/50 bg-muted/50 px-8 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none"
            placeholder="Search for tokens or dexes"
            value={searchTerm}
            aria-label="Search new on-chain pairs"
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      <DataTableWrapper
        label={view === "evm" ? "New on-chain pairs" : "Pump.fun new tokens"}
        columns={view === "evm" ? ["Pair", "Dex", "Network", "Liquidity", "Vol 24h", "Created"] : ["Token", "MCap", "Liquidity", "Price", "Created"]}
        template={view === "evm" ? NEW_PAIRS_TEMPLATE : PUMPFUN_TEMPLATE}
        bodyHeight={520}
      >
        {isLoading ? (
          <TableSkeleton rows={6} columns={view === "evm" ? 6 : 5} template={view === "evm" ? NEW_PAIRS_TEMPLATE : PUMPFUN_TEMPLATE} />
        ) : showEmpty ? (
          <TableEmptyState
            message={
              isError
                ? view === "evm"
                  ? "Unable to load new pairs right now."
                  : "Unable to load Pump.fun feed right now."
                : searchTerm
                  ? view === "evm"
                    ? "No pairs match that search."
                    : "No tokens match that search."
                  : view === "evm"
                    ? "No fresh pairs available right now."
                    : "No Pump.fun tokens available right now."
            }
          />
        ) : (
          <div className="divide-y divide-border/50">
            {view === "evm"
              ? (rows as DexPairSummary[]).map((pool) => <NewPairRow key={pool.id} pool={pool} />)
              : (rows as PumpfunNewToken[]).map((token) => <PumpfunTokenRow key={token.address} token={token} />)}
          </div>
        )}
      </DataTableWrapper>
      <div className="flex items-center gap-2">
        {(["evm", "pumpfun"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setView(tab)}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16px] transition-colors",
              view === tab
                ? "border-border/60 bg-muted text-foreground"
                : "border-border/40 text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === "evm" ? "EVM" : "Pump.fun"}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>
          Page {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-border/50 px-3 py-1 text-xs transition hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded-md border border-border/50 px-3 py-1 text-xs transition hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isLoading}
          >
            Next
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Source · {view === "evm" ? "DEXTools & Dexscreener fallback" : "Moralis Pump.fun"}
      </p>
    </section>
  );
}

function NewPairRow({ pool }: { pool: DexPairSummary }) {
  const baseSymbol = pool.baseToken?.symbol ?? pool.baseToken?.name ?? "?";
  const quoteSymbol = pool.quoteToken?.symbol ?? pool.quoteToken?.name ?? "?";
  const pairLabel = `${baseSymbol}/${quoteSymbol}`;
  const baseName = pool.baseToken?.name ?? pool.baseToken?.symbol ?? "";
  const quoteName = pool.quoteToken?.name ?? pool.quoteToken?.symbol ?? "";
  const createdLabel = formatRelativeTime(pool.pairCreatedAt ?? null);
  const RowContent = (
    <div role="row" className="grid items-center gap-3 px-4 py-3 text-sm text-foreground transition hover:bg-muted/50" style={{ gridTemplateColumns: NEW_PAIRS_TEMPLATE }}>
      <div role="cell">
        <div className="text-[14px] font-semibold tracking-[0.16px]">{pairLabel}</div>
        <p className="text-[11px] uppercase tracking-[0.16px] text-muted-foreground">
          {baseName ? `${baseName} · ${quoteName}` : quoteName || "-"}
        </p>
      </div>
      <div role="cell" className="text-[12px] text-muted-foreground">{pool.dexName ?? pool.dexId ?? pool.source?.toUpperCase() ?? "-"}</div>
      <div role="cell" className="text-[12px] text-muted-foreground">{pool.network ?? pool.chainId ?? "-"}</div>
      <div role="cell" className="font-medium text-foreground">{formatCurrency(pool.liquidityUsd, { currency: "usd", compact: true })}</div>
      <div role="cell" className="text-muted-foreground">{formatCurrency(pool.volumeUsd24h, { currency: "usd", compact: true })}</div>
      <div role="cell" className="text-[12px] text-muted-foreground">{createdLabel}</div>
    </div>
  );

  if (pool.url) {
    return (
      <a href={pool.url} target="_blank" rel="noopener noreferrer" className="block">
        {RowContent}
      </a>
    );
  }

  return RowContent;
}

function PumpfunTokenRow({ token }: { token: PumpfunNewToken }) {
  const label = token.symbol ?? token.name ?? token.address.slice(0, 6);
  const createdLabel = formatRelativeTime(token.createdAt ?? null);

  return (
    <div
      role="row"
      className="grid items-center gap-3 px-4 py-3 text-sm text-foreground transition hover:bg-muted/50"
      style={{ gridTemplateColumns: PUMPFUN_TEMPLATE }}
    >
      <div role="cell">
        <div className="text-[14px] font-semibold tracking-[0.16px]">{label}</div>
        <p className="text-[11px] uppercase tracking-[0.16px] text-muted-foreground">
          {token.name ? token.name : token.address.slice(0, 8)}
        </p>
      </div>
      <div role="cell" className="font-medium text-foreground">
        {formatCurrency(token.marketCapUsd, { currency: "usd", compact: true })}
      </div>
      <div role="cell" className="text-muted-foreground">
        {formatCurrency(token.liquidityUsd, { currency: "usd", compact: true })}
      </div>
      <div role="cell" className="text-muted-foreground">
        {formatCurrency(token.priceUsd, { currency: "usd" })}
      </div>
      <div role="cell" className="text-[12px] text-muted-foreground">{createdLabel}</div>
    </div>
  );
}
