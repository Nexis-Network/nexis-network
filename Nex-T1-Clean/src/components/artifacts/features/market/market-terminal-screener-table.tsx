"use client";

import { cn } from "@/lib/utils";
import type { MarketTerminalScreenerRow } from "@/modules/shared/artifacts/market-terminal";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from "./market-terminal-shared";

type MarketTerminalScreenerTableProps = {
  rows: MarketTerminalScreenerRow[];
  selectedAssetId: string | null;
  totalRowCount: number;
  onRowClick: (row: MarketTerminalScreenerRow) => void;
};

export function MarketTerminalScreenerTable({
  rows,
  selectedAssetId,
  totalRowCount,
  onRowClick,
}: MarketTerminalScreenerTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
        No assets matched the current screen.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-xs text-muted-foreground">
        <span>Showing {rows.length} assets</span>
        <span>{totalRowCount} total rows loaded</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
        <table className="w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#0b0d10] text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Asset</th>
              <th className="px-3 py-2 font-medium">Chain</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">24H</th>
              <th className="px-3 py-2 font-medium">Market Cap</th>
              <th className="px-3 py-2 font-medium">Volume</th>
              <th className="px-3 py-2 font-medium">Narrative</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = row.assetId === selectedAssetId;

              return (
                <tr
                  key={row.assetId}
                  className={cn(
                    "border-b border-border/40 text-foreground transition-colors",
                    isSelected && "bg-white/6",
                  )}
                >
                  <td className="px-3 py-2">
                    <button
                      className="w-full rounded-md px-2 py-2 text-left hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                      onClick={() => onRowClick(row)}
                      type="button"
                    >
                      <div className="font-medium">{row.symbol}</div>
                      <div className="text-xs text-muted-foreground">{row.name}</div>
                    </button>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{row.chain}</td>
                  <td className="px-3 py-2">{formatCurrency(row.price)}</td>
                  <td
                    className={cn(
                      "px-3 py-2",
                      (row.change24hPct ?? 0) > 0 && "text-emerald-400",
                      (row.change24hPct ?? 0) < 0 && "text-rose-400",
                    )}
                  >
                    {formatPercent(row.change24hPct)}
                  </td>
                  <td className="px-3 py-2">
                    {formatCompactCurrency(row.marketCap)}
                  </td>
                  <td className="px-3 py-2">
                    {formatCompactCurrency(row.volume24h)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.narrative ?? "Unclassified"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
