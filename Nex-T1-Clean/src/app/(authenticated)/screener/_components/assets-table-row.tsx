"use client";

import type { JSX } from "react";
import { memo } from "react";
import Image from "next/image";
import { ShieldAlert, ShieldCheck } from "lucide-react";

import { Sparkline } from "@/components/ui/sparkline";
import { getPrimaryIcon } from "@/lib/token-icons";
import type { CoinMarketRow } from "@/types/market/market-data";

import {
  ASSETS_TABLE_GRID_CLASS,
  SCREENER_TABLE_STICKY_LEFT_SURFACE_CLASS,
  formatCompactPrice,
  formatCompactUsd,
} from "./assets-table.constants";
import { PriceCell } from "./price-cell";
import { AssetsTableRowActions } from "./assets-table-row-actions";
import type { AssetRowRefSetter } from "./assets-table.types";
import { getSignalBadge } from "./assets-table.sorting";

type AssetsTableRowProps = {
  asset: CoinMarketRow;
  index: number;
  isInWatchlist: boolean;
  isWatchlistMutating: boolean;
  limit: number;
  onAssetOpen: (asset: CoinMarketRow) => void;
  onCopyAddress: (asset: CoinMarketRow) => void;
  onSwap: (asset: CoinMarketRow) => void;
  onToggleWatchlist: (asset: CoinMarketRow, watchlistItemId?: string) => Promise<void>;
  page: number;
  setRowRef: AssetRowRefSetter;
  watchlistItemId?: string;
};

function AssetsTableRowComponent(args: AssetsTableRowProps): JSX.Element {
  const price = args.asset.currentPrice ?? 0;
  const change24h = args.asset.priceChangePercentage24h ?? 0;
  const change7d = args.asset.priceChangePercentage7d ?? 0;
  const signal = getSignalBadge(change24h);
  const sparklineData =
    args.asset.sparkline7d && args.asset.sparkline7d.length > 2 ? args.asset.sparkline7d : [];
  const rowIndex = (args.page - 1) * args.limit + args.index + 1;

  return (
    <div
      data-asset-id={args.asset.id}
      ref={(node) => args.setRowRef(node, args.asset.id)}
      onClick={() => args.onAssetOpen(args.asset)}
      className={`group cursor-pointer items-center border-b border-[var(--screener-table-border)] py-4 transition-colors hover:bg-[var(--screener-table-row-hover)] last:border-0 ${ASSETS_TABLE_GRID_CLASS} [content-visibility:auto] [contain-intrinsic-size:var(--screener-table-row-intrinsic-size)]`}
    >
      <div
        className={`sticky left-0 z-20 flex items-center gap-3 pl-6 ${SCREENER_TABLE_STICKY_LEFT_SURFACE_CLASS}`}
      >
        <span className="block w-4 text-center text-xs text-[var(--screener-table-subtle)]">
          {rowIndex}
        </span>
        <div className="relative">
          <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--screener-table-surface-elevated)]">
            {args.asset.image ? (
              <Image src={args.asset.image} alt={args.asset.name} fill className="object-cover" unoptimized />
            ) : (
              <div className="text-[10px] text-[var(--screener-table-muted)]">
                {args.asset.symbol.slice(0, 2)}
              </div>
            )}
          </div>
          {args.asset.chain && args.asset.symbol.toLowerCase() !== args.asset.chain.toLowerCase() ? (
            <div className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--screener-table-surface)] p-[1px]">
              <Image
                src={getPrimaryIcon({ name: args.asset.chain, kind: "network" })}
                alt={args.asset.chain}
                width={12}
                height={12}
                className="rounded-full"
                unoptimized
              />
            </div>
          ) : null}
        </div>
        <div className="flex flex-col">
          <span className="max-w-[100px] truncate text-[11px] font-medium text-[var(--screener-table-foreground)]">
            {args.asset.name}
          </span>
          <span className="text-[11px] text-[var(--screener-table-muted)]">
            {args.asset.symbol.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex h-full items-center justify-end">
        <PriceCell
          price={price}
          className="text-[12px]"
        />
      </div>

      <div className="text-right">
        <span
          className="text-[12px] font-medium"
          style={{
            color:
              change24h >= 0
                ? "var(--screener-table-positive)"
                : "var(--screener-table-negative)",
          }}
        >
          {change24h >= 0 ? "+" : ""}
          {change24h.toFixed(2)}%
        </span>
      </div>

      <div className="text-right">
        <span
          className="text-[12px] font-medium"
          style={{
            color:
              change7d >= 0
                ? "var(--screener-table-positive)"
                : "var(--screener-table-negative)",
          }}
        >
          {change7d >= 0 ? "+" : ""}
          {change7d.toFixed(2)}%
        </span>
      </div>

      <div className="flex flex-col justify-center text-right">
        <span className="text-[11px] text-[var(--screener-table-foreground)]">
          {args.asset.high24h ? formatCompactPrice(args.asset.high24h) : "-"}
        </span>
        <span className="text-[10px] text-[var(--screener-table-subtle)]">
          {args.asset.low24h ? formatCompactPrice(args.asset.low24h) : "-"}
        </span>
      </div>

      <div className="flex flex-col justify-center text-right">
        <span className="text-[11px] text-[var(--screener-table-foreground)]">
          {args.asset.high7d ? formatCompactPrice(args.asset.high7d) : "-"}
        </span>
        <span className="text-[10px] text-[var(--screener-table-subtle)]">
          {args.asset.low7d ? formatCompactPrice(args.asset.low7d) : "-"}
        </span>
      </div>

      <div className="flex h-full items-center justify-center pl-4">
        {sparklineData.length > 0 ? (
          <Sparkline
            data={sparklineData}
            width={80}
            height={32}
            color={
              change7d >= 0
                ? "var(--screener-table-positive)"
                : "var(--screener-table-negative)"
            }
            className="opacity-80"
          />
        ) : (
          <span className="text-xs text-[var(--screener-table-subtle)]">-</span>
        )}
      </div>

      <div className="text-right text-[12px] text-[var(--screener-table-foreground)]">
        {formatCompactUsd(args.asset.marketCap ?? 0)}
      </div>
      <div className="text-right text-[12px] text-[var(--screener-table-foreground)]">
        {formatCompactUsd(args.asset.volume24hUsd ?? 0)}
      </div>

      <div className="flex justify-center">
        <div
          className="whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={signal.style}
        >
          {signal.label}
        </div>
      </div>

      <div className="pl-2">
        <div className="inline-flex items-center rounded-full border border-[var(--screener-table-border)] bg-[var(--screener-table-surface-elevated)] px-2 py-0.5 text-[10px] text-[var(--screener-table-muted)]">
          {args.asset.narrative || "Unk"}
        </div>
      </div>

      <div className="group/safety relative flex justify-center">
        {args.asset.isAuditSafe ? (
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--screener-table-positive)]" />
        ) : (
          <ShieldAlert className="h-3.5 w-3.5 text-[var(--screener-table-negative)]" />
        )}
        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-lg border border-[var(--screener-table-border-strong)] bg-[var(--screener-table-surface-elevated)] p-3 opacity-0 shadow-xl transition-opacity group-hover/safety:opacity-100 hover:opacity-100">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--screener-table-foreground)]">Trust Score</span>
            <span
              className={`text-xs font-mono ${(args.asset.auditScore || 0) > 70 ? "text-[var(--screener-table-positive)]" : "text-[var(--screener-table-negative)]"}`}
            >
              {args.asset.auditScore || "N/A"}/100
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-[var(--screener-table-muted)]">
              <span>Mint Auth</span>
              <span className="text-[var(--screener-table-positive)]">
                {args.asset.isAuditSafe ? "Disabled" : "Active"}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-[var(--screener-table-muted)]">
              <span>LP Locked</span>
              <span className="text-[var(--screener-table-positive)]">Yes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1">
        {args.asset.socialDominance ? (
          <span
            className={`text-[11px] font-mono ${args.asset.socialDominance > 1 ? "text-[var(--screener-table-positive)]" : "text-[var(--screener-table-muted)]"}`}
          >
            {args.asset.socialDominance.toFixed(2)}%
          </span>
        ) : (
          <span className="text-[10px] text-[var(--screener-table-subtle)]">-</span>
        )}
      </div>

      <div className="flex items-center justify-center">
        <div className="flex -space-x-1.5">
          <div className="relative z-10 h-5 w-5 overflow-hidden rounded-full border border-[var(--screener-table-surface)] bg-[var(--screener-table-surface-elevated)]">
            {args.asset.pairImage?.[0] ? (
              <Image src={args.asset.pairImage[0]} alt="Base" fill className="object-cover" unoptimized />
            ) : null}
          </div>
          <div className="relative z-0 h-5 w-5 overflow-hidden rounded-full border border-[var(--screener-table-surface)] bg-[var(--screener-table-surface-elevated)]">
            {args.asset.pairImage?.[1] ? (
              <Image src={args.asset.pairImage[1]} alt="Quote" fill className="object-cover" unoptimized />
            ) : null}
          </div>
        </div>
      </div>

      <AssetsTableRowActions
        asset={args.asset}
        isInWatchlist={args.isInWatchlist}
        isWatchlistMutating={args.isWatchlistMutating}
        onCopyAddress={args.onCopyAddress}
        onSwap={args.onSwap}
        onToggleWatchlist={args.onToggleWatchlist}
        watchlistItemId={args.watchlistItemId}
      />
    </div>
  );
}

export const AssetsTableRow = memo(AssetsTableRowComponent);
