"use client";

import type { JSX } from "react";
import { ArrowRightLeft, Copy, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CoinMarketRow } from "@/types/market/market-data";

import { SCREENER_TABLE_STICKY_RIGHT_SURFACE_CLASS } from "./assets-table.constants";

export function AssetsTableRowActions(args: {
  asset: CoinMarketRow;
  isInWatchlist: boolean;
  isWatchlistMutating: boolean;
  onCopyAddress: (asset: CoinMarketRow) => void;
  onSwap: (asset: CoinMarketRow) => void;
  onToggleWatchlist: (asset: CoinMarketRow, watchlistItemId?: string) => Promise<void>;
  watchlistItemId?: string;
}): JSX.Element {
  return (
    <div
      className={`sticky right-0 z-20 flex h-full items-center justify-end gap-1 pr-6 ${SCREENER_TABLE_STICKY_RIGHT_SURFACE_CLASS}`}
    >
      <Button
        variant="ghost"
        size="icon"
        className={`h-7 w-7 rounded-full transition-all ${args.isInWatchlist ? "bg-[color-mix(in_oklab,var(--screener-table-positive)_18%,transparent)] text-[var(--screener-table-positive)] hover:bg-[color-mix(in_oklab,var(--screener-table-positive)_24%,transparent)]" : "bg-[var(--screener-table-surface-elevated)] text-[var(--screener-table-muted)] hover:bg-[var(--screener-table-row-hover)] hover:text-[var(--screener-table-foreground)]"}`}
        disabled={args.isWatchlistMutating}
        onClick={(event) => {
          event.stopPropagation();
          void args.onToggleWatchlist(args.asset, args.watchlistItemId);
        }}
      >
        <Star className={`h-3.5 w-3.5 ${args.isInWatchlist ? "fill-current" : ""}`} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full bg-[var(--screener-table-surface-elevated)] text-[var(--screener-table-muted)] transition-all hover:bg-[var(--screener-table-row-hover)] hover:text-[var(--screener-table-foreground)]"
        onClick={(event) => {
          event.stopPropagation();
          args.onCopyAddress(args.asset);
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full bg-[var(--screener-table-surface-elevated)] text-[var(--screener-table-muted)] transition-all hover:bg-[color-mix(in_oklab,var(--screener-table-info)_10%,transparent)] hover:text-[var(--screener-table-info)]"
        onClick={(event) => {
          event.stopPropagation();
          args.onSwap(args.asset);
        }}
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
