"use client";

import "@1771technologies/lytenyte-pro/grid.css";
import "@1771technologies/lytenyte-pro/components.css";
import "@1771technologies/lytenyte-pro/light-dark.css";

import {
  Grid,
  activateLicense,
  useClientDataSource,
  useServerDataSource,
} from "@1771technologies/lytenyte-pro";
import { useEffect, useId, useRef, useState } from "react";

import type {
  MarketTerminalScreenerRow,
  MarketTerminalTradeHistoryResponse,
  MarketTerminalTradeRow,
} from "@/modules/shared/artifacts/market-terminal";
import { activateMarketTerminalLicense } from "./market-terminal-helpers";
import { MarketTerminalTradeTapeToolbar } from "./market-terminal-chrome";
import {
  createTradeResponse,
  type MarketTerminalGridSpec,
  screenerColumnBase,
  screenerColumns,
  screenerRowGroupColumn,
  tradeColumnBase,
  tradeColumns,
} from "./market-terminal-grid";

type MarketTerminalPivotModel = {
  rows: Array<{ id: string }>;
  columns: Array<{ id: string }>;
  measures: Array<{
    dim: {
      id: string;
      name: string;
      type: string;
    };
    fn: string;
  }>;
};

type MarketTerminalAdvancedGridsProps = {
  activeView: "pivot" | "trade-tape";
  liveRows: MarketTerminalScreenerRow[];
  pivotModel: MarketTerminalPivotModel;
  sortModel: Array<{
    dim: { id: string };
    descending: boolean;
  }>;
  filterFns: Array<(node: { data: MarketTerminalScreenerRow }) => boolean> | null;
  effectivePools: string[];
  selectedPoolsKey: string;
  poolDraft: string;
  onPoolDraftChange: (value: string) => void;
  onApplyPools: () => void;
  onRowClick: (row: MarketTerminalScreenerRow) => void;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const message = await response.text().catch(() => "Request failed");
    throw new Error(message || "Request failed");
  }
  return (await response.json()) as T;
}

export function MarketTerminalAdvancedGrids({
  activeView,
  liveRows,
  pivotModel,
  sortModel,
  filterFns,
  effectivePools,
  selectedPoolsKey,
  poolDraft,
  onPoolDraftChange,
  onApplyPools,
  onRowClick,
}: MarketTerminalAdvancedGridsProps) {
  const screenerGridId = useId();
  const tradeGridId = useId();
  const [tradeRows, setTradeRows] = useState<MarketTerminalTradeRow[]>([]);
  const tradeRowsRef = useRef<MarketTerminalTradeRow[]>([]);
  const licenseActivatedRef = useRef(false);

  useEffect(() => {
    if (licenseActivatedRef.current) {
      return;
    }

    licenseActivatedRef.current = activateMarketTerminalLicense({
      activateLicense,
      env: process.env.NODE_ENV,
      hostname:
        typeof window !== "undefined" ? window.location.hostname : undefined,
      licenseKey: process.env.NEXT_PUBLIC_LYTENYTE_LICENSE,
    });
  }, []);

  const tradeDs = useServerDataSource<MarketTerminalTradeRow, [string]>({
    queryKey: [selectedPoolsKey],
    blockSize: 100,
    queryFn: async ({ requests, queryKey }) => {
      const pools = queryKey[0]
        .split(",")
        .map((pool) => pool.trim())
        .filter(Boolean);

      if (pools.length === 0) {
        tradeRowsRef.current = [];
        setTradeRows([]);
        return requests.map((request) =>
          createTradeResponse(request, [], Date.now()),
        );
      }

      const history = await fetchJson<MarketTerminalTradeHistoryResponse>(
        `/api/market-terminal/trades/history?pools=${encodeURIComponent(
          pools.join(","),
        )}&limit=200`,
      );
      tradeRowsRef.current = history.rows;
      setTradeRows(history.rows);

      return requests.map((request) =>
        createTradeResponse(request, history.rows, Date.now()),
      );
    },
  });

  useEffect(() => {
    if (!selectedPoolsKey) {
      tradeRowsRef.current = [];
      setTradeRows([]);
      tradeDs.reset();
      return;
    }

    const es = new EventSource(
      `/api/market/trades/stream?pools=${encodeURIComponent(selectedPoolsKey)}`,
    );

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          data?: Record<string, unknown>;
        };

        if (payload.type !== "trade" || !payload.data) {
          return;
        }

        const nextRow: MarketTerminalTradeRow = {
          id: `${payload.data.txHash}:${payload.data.timestamp}`,
          poolKey: `${payload.data.network}:${payload.data.poolAddress}`.toLowerCase(),
          network: String(payload.data.network ?? ""),
          poolAddress: String(payload.data.poolAddress ?? ""),
          txHash: String(payload.data.txHash ?? ""),
          side: payload.data.type === "sell" ? "sell" : "buy",
          tokenAmount: String(payload.data.tokenAmount ?? "0"),
          quoteAmount: String(payload.data.quoteAmount ?? "0"),
          volumeUsd: Number(payload.data.volumeUsd ?? 0),
          priceNative: Number(payload.data.priceNative ?? 0),
          priceUsd: Number(payload.data.priceUsd ?? 0),
          timestamp: Number(payload.data.timestamp ?? Date.now()),
        };

        const deduped = [
          nextRow,
          ...tradeRowsRef.current.filter((row) => row.id !== nextRow.id),
        ].slice(0, 200);

        tradeRowsRef.current = deduped;
        setTradeRows(deduped);
        tradeDs.pushResponses([
          {
            kind: "center",
            asOfTime: Date.now(),
            path: [],
            start: 0,
            end: deduped.length,
            size: deduped.length,
            data: deduped.map((row) => ({
              kind: "leaf" as const,
              id: row.id,
              data: row,
            })),
          },
        ]);
      } catch {
        // Ignore malformed SSE frames.
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [selectedPoolsKey, tradeDs]);

  const screenerDs = useClientDataSource<MarketTerminalGridSpec>({
    data: liveRows,
    pivotMode: activeView === "pivot",
    pivotModel: pivotModel as never,
    sort: sortModel as never,
    filter: filterFns as never,
  });
  const pivotProps = screenerDs.usePivotProps();

  if (activeView === "trade-tape") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <MarketTerminalTradeTapeToolbar
          poolDraft={poolDraft}
          tradeRowCount={tradeRows.length}
          onPoolDraftChange={onPoolDraftChange}
          onApplyPools={onApplyPools}
        />
        {effectivePools.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Add one or more CoinGecko OnchainTrade pool keys to stream live
            trade tape data.
          </div>
        ) : (
          <div className="ln-grid h-full px-3 py-3">
            <Grid
              gridId={`${tradeGridId}-trades`}
              columns={tradeColumns as never}
              rowSource={tradeDs}
              columnBase={tradeColumnBase as never}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ln-grid h-full px-3 py-3">
      <Grid
        gridId={`${screenerGridId}-pivot`}
        columns={screenerColumns as never}
        rowSource={screenerDs}
        columnBase={screenerColumnBase as never}
        rowGroupColumn={screenerRowGroupColumn as never}
        rowSelectionMode="single"
        rowSelectionActivator="single-click"
        events={{
          row: {
            click: ({ row }) => {
              if (row.kind !== "leaf") {
                return;
              }

              onRowClick(row.data as MarketTerminalScreenerRow);
            },
          },
        }}
        {...(pivotProps as Record<string, unknown>)}
      />
    </div>
  );
}

export default MarketTerminalAdvancedGrids;
