"use client";

import type {
  DataRequest,
  DataResponse,
} from "@1771technologies/lytenyte-pro";
import { Grid } from "@1771technologies/lytenyte-pro";
import { RowGroupCell } from "@1771technologies/lytenyte-pro/components";

import { cn } from "@/lib/utils";
import type {
  MarketTerminalScreenerRow,
  MarketTerminalTradeRow,
} from "@/modules/shared/artifacts/market-terminal";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  formatTradeTime,
} from "./market-terminal-shared";

export type MarketTerminalGridSpec = {
  data: MarketTerminalScreenerRow;
};

export type MarketTradeGridSpec = {
  data: MarketTerminalTradeRow;
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

export function createTradeResponse(
  request: DataRequest,
  rows: MarketTerminalTradeRow[],
  asOfTime: number,
): DataResponse {
  const slice = rows.slice(request.start, request.end);

  return {
    kind: "center",
    asOfTime,
    path: [],
    start: request.start,
    end: request.start + slice.length,
    size: rows.length,
    data: slice.map((row) => ({
      kind: "leaf" as const,
      id: row.id,
      data: row,
    })),
  };
}

export const screenerColumnBase: Grid.ColumnBase<MarketTerminalGridSpec> = {
  width: 140,
  widthFlex: 1,
  cellRenderer: ({ api, column, row }) => {
    if (row.kind !== "leaf") {
      return (
        <div className="flex h-full items-center px-3 text-xs text-muted-foreground">
          {row.kind === "branch" ? row.key ?? "Group" : "Aggregate"}
        </div>
      );
    }

    const value = api.columnField(column, row);
    const id = column.id;

    let display: string;
    if (id === "price") {
      display = formatCurrency(typeof value === "number" ? value : null);
    } else if (id === "change24hPct") {
      display = formatPercent(typeof value === "number" ? value : null);
    } else if (id === "marketCap" || id === "volume24h") {
      display = formatCompactCurrency(typeof value === "number" ? value : null);
    } else if (
      id === "liquidityScore" ||
      id === "auditScore" ||
      id === "socialDominance"
    ) {
      display =
        typeof value === "number" ? numberFormatter.format(value) : "N/A";
    } else {
      display = typeof value === "string" ? value : `${value ?? ""}`;
    }

    return (
      <div
        className={cn(
          "flex h-full items-center px-3 text-xs",
          id === "change24hPct" &&
            typeof value === "number" &&
            value > 0 &&
            "text-emerald-400",
          id === "change24hPct" &&
            typeof value === "number" &&
            value < 0 &&
            "text-rose-400",
        )}
      >
        {display}
      </div>
    );
  },
};

export const tradeColumnBase: Grid.ColumnBase<MarketTradeGridSpec> = {
  width: 130,
  widthFlex: 1,
  cellRenderer: ({ api, column, row }) => {
    if (row.kind !== "leaf") {
      return null;
    }

    const value = api.columnField(column, row);
    const id = column.id;

    let display: string;
    if (id === "priceUsd" || id === "volumeUsd") {
      display =
        id === "volumeUsd"
          ? formatCompactCurrency(typeof value === "number" ? value : null)
          : formatCurrency(typeof value === "number" ? value : null);
    } else if (id === "timestamp") {
      display = formatTradeTime(typeof value === "number" ? value : 0);
    } else {
      display = typeof value === "string" ? value : `${value ?? ""}`;
    }

    return (
      <div
        className={cn(
          "flex h-full items-center px-3 text-xs",
          id === "side" && value === "buy" && "text-emerald-400",
          id === "side" && value === "sell" && "text-rose-400",
        )}
      >
        {display}
      </div>
    );
  },
};

export const screenerColumns: Grid.Column<MarketTerminalGridSpec>[] = [
  { id: "symbol", name: "Symbol", width: 90, pin: "start" },
  { id: "name", name: "Name", width: 180, pin: "start" },
  { id: "chain", name: "Chain", width: 110 },
  { id: "narrative", name: "Narrative", width: 130 },
  { id: "price", name: "Price", type: "number", width: 120 },
  { id: "change24hPct", name: "24H", type: "number", width: 100 },
  { id: "marketCap", name: "Market Cap", type: "number", width: 140 },
  { id: "volume24h", name: "Volume", type: "number", width: 140 },
  { id: "liquidityScore", name: "Liquidity", type: "number", width: 110 },
  { id: "auditScore", name: "Audit", type: "number", width: 90 },
  { id: "socialDominance", name: "Social", type: "number", width: 90 },
];

export const tradeColumns: Grid.Column<MarketTradeGridSpec>[] = [
  { id: "timestamp", name: "Time", width: 110, pin: "start" },
  { id: "side", name: "Side", width: 80, pin: "start" },
  { id: "network", name: "Network", width: 100 },
  { id: "priceUsd", name: "Price", type: "number", width: 120 },
  { id: "volumeUsd", name: "Volume", type: "number", width: 130 },
  { id: "tokenAmount", name: "Base", width: 120 },
  { id: "quoteAmount", name: "Quote", width: 120 },
  { id: "poolAddress", name: "Pool", width: 240 },
  { id: "txHash", name: "Tx Hash", width: 220 },
];

export const screenerRowGroupColumn = {
  cellRenderer: RowGroupCell,
  width: 200,
  pin: "start" as const,
};
