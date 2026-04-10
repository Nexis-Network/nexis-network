"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useArtifactRuntime } from "@/lib/ai/artifact-runtime";
import { useMarketTerminalArtifact } from "@/hooks/ai";
import { useMarketStream } from "@/hooks/use-market-stream";
import { useWatchlist } from "@/lib/hooks/watchlist/use-watchlist";
import type {
  MarketTerminalArtifactPayload,
  MarketTerminalScreenerResponse,
  MarketTerminalScreenerRow,
} from "@/modules/shared/artifacts/market-terminal";
import {
  MarketTerminalArtifactSchema,
  createMarketTerminalArtifactPayload,
} from "@/modules/shared/artifacts/market-terminal";
import {
  MARKET_TERMINAL_SUBMIT_EVENT,
  createMarketTerminalChatHandoff,
} from "./market-terminal-helpers";
import {
  MarketTerminalControls,
  MarketTerminalHeader,
  MarketTerminalPivotPresets,
  MarketTerminalReviewPanels,
  MarketTerminalViewTabs,
} from "./market-terminal-chrome";
import {
  MARKET_TERMINAL_DEFAULT_LIMIT,
  MARKET_TERMINAL_DIMENSIONS,
  MARKET_TERMINAL_LIVE_PRICE_LIMIT,
  getSelectedAsset,
  getVisibleScreenerRows,
  normalizePoolsInput,
} from "./market-terminal-shared";
import { MarketTerminalScreenerTable } from "./market-terminal-screener-table";

const MarketTerminalAdvancedGrids = dynamic(
  () =>
    import("./market-terminal-advanced-grids").then((mod) => ({
      default: mod.MarketTerminalAdvancedGrids,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading advanced market terminal tools…
      </div>
    ),
  },
);

type MarketTerminalSurfaceProps = {
  artifactData: MarketTerminalArtifactPayload;
  onArtifactChange?: (next: MarketTerminalArtifactPayload) => void;
  chatActionsEnabled?: boolean;
};

const QUERY_DEBOUNCE_MS = 250;

function areStringArraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function resolveSortPreset(
  artifactData: MarketTerminalArtifactPayload,
): string {
  return artifactData.sortModel[0]?.columnId
    ? `${artifactData.sortModel[0].columnId}:${artifactData.sortModel[0].direction}`
    : "marketCap:desc";
}

function formatSelectedPoolsDraft(selectedPools: string[]): string {
  return selectedPools.join(", ");
}

type MarketTerminalPersistedViewState = {
  activeView: MarketTerminalArtifactPayload["initialView"];
  chain: string;
  poolDraft: string;
  query: string;
  selectedAssetId: string | null;
  sortPreset: string;
};

function getPersistedViewState(
  artifactData: MarketTerminalArtifactPayload,
): MarketTerminalPersistedViewState {
  return {
    activeView: artifactData.initialView,
    query: artifactData.query,
    chain: artifactData.chain,
    sortPreset: resolveSortPreset(artifactData),
    poolDraft: formatSelectedPoolsDraft(artifactData.selectedPools),
    selectedAssetId: artifactData.selectedAssetIds[0] ?? null,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const message = await response.text().catch(() => "Request failed");
    throw new Error(message || "Request failed");
  }
  return (await response.json()) as T;
}

function emitTerminalChatHandoff(
  input: ReturnType<typeof createMarketTerminalChatHandoff>,
) {
  window.dispatchEvent(
    new CustomEvent(MARKET_TERMINAL_SUBMIT_EVENT, {
      detail: input,
    }),
  );
}

function coerceMarketTerminalArtifactData(
  candidate: UntypedJson | null,
): MarketTerminalArtifactPayload {
  const direct = MarketTerminalArtifactSchema.safeParse(candidate);
  if (direct.success) {
    return direct.data;
  }

  if (candidate && typeof candidate === "object" && "payload" in candidate) {
    const nested = MarketTerminalArtifactSchema.safeParse(
      (candidate as { payload?: UntypedJson }).payload,
    );
    if (nested.success) {
      return nested.data;
    }
  }

  return createMarketTerminalArtifactPayload({ title: "Market Terminal" });
}

export function MarketTerminalArtifactSurface({
  artifactData,
  onArtifactChange,
  chatActionsEnabled = true,
}: MarketTerminalSurfaceProps) {
  const persistedViewState = useMemo(
    () => getPersistedViewState(artifactData),
    [artifactData],
  );
  const previousPersistedViewStateRef = useRef(persistedViewState);
  const [activeView, setActiveView] = useState(persistedViewState.activeView);
  const [queryDraft, setQueryDraft] = useState(persistedViewState.query);
  const [debouncedQuery, setDebouncedQuery] = useState(persistedViewState.query);
  const [chain, setChain] = useState(persistedViewState.chain);
  const [sortPreset, setSortPreset] = useState(persistedViewState.sortPreset);
  const [poolDraft, setPoolDraft] = useState(persistedViewState.poolDraft);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(
    persistedViewState.selectedAssetId,
  );
  const [screener, setScreener] =
    useState<MarketTerminalScreenerResponse | null>(null);
  const [isLoadingScreener, setIsLoadingScreener] = useState(false);
  const [screenerError, setScreenerError] = useState<string | null>(null);
  const { addItem, isMutating } = useWatchlist("usd");

  useEffect(() => {
    const previous = previousPersistedViewStateRef.current;

    if (previous.activeView !== persistedViewState.activeView) {
      setActiveView((current) =>
        current === previous.activeView ? persistedViewState.activeView : current,
      );
    }

    if (previous.query !== persistedViewState.query) {
      setQueryDraft((current) =>
        current === previous.query ? persistedViewState.query : current,
      );
      setDebouncedQuery((current) =>
        current === previous.query ? persistedViewState.query : current,
      );
    }

    if (previous.chain !== persistedViewState.chain) {
      setChain((current) =>
        current === previous.chain ? persistedViewState.chain : current,
      );
    }

    if (previous.sortPreset !== persistedViewState.sortPreset) {
      setSortPreset((current) =>
        current === previous.sortPreset ? persistedViewState.sortPreset : current,
      );
    }

    if (previous.poolDraft !== persistedViewState.poolDraft) {
      setPoolDraft((current) =>
        current === previous.poolDraft ? persistedViewState.poolDraft : current,
      );
    }

    if (previous.selectedAssetId !== persistedViewState.selectedAssetId) {
      setSelectedAssetId((current) =>
        current === previous.selectedAssetId
          ? persistedViewState.selectedAssetId
          : current,
      );
    }

    previousPersistedViewStateRef.current = persistedViewState;
  }, [
    persistedViewState,
  ]);

  const persistArtifact = (patch: Partial<MarketTerminalArtifactPayload>) => {
    const next = createMarketTerminalArtifactPayload({
      ...artifactData,
      ...patch,
    });
    onArtifactChange?.(next);
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(queryDraft);
    }, QUERY_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [queryDraft]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setIsLoadingScreener(true);
      setScreenerError(null);

      try {
        const params = new URLSearchParams({
          chain,
          query: debouncedQuery,
          limit: `${MARKET_TERMINAL_DEFAULT_LIMIT}`,
        });
        const payload = await fetchJson<MarketTerminalScreenerResponse>(
          `/api/market-terminal/screener?${params.toString()}`,
        );
        if (controller.signal.aborted) {
          return;
        }
        setScreener(payload);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setScreenerError(error instanceof Error ? error.message : String(error));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingScreener(false);
        }
      }
    };

    void load();
    return () => controller.abort();
  }, [chain, debouncedQuery]);

  const coinIds = (screener?.metadata.coinIds ?? []).slice(
    0,
    MARKET_TERMINAL_LIVE_PRICE_LIMIT,
  );
  const { data: livePrices, isConnected: isPriceStreamConnected } =
    useMarketStream(coinIds);

  const effectivePools = artifactData.selectedPools;
  const selectedPoolsKey = effectivePools.join(",");

  const liveRows = useMemo(() => {
    const currentRows = screener?.rows ?? [];
    if (!currentRows.length) {
      return currentRows;
    }

    return currentRows.map((row) => {
      const live = livePrices[row.assetId];
      if (!live) {
        return row;
      }

      return {
        ...row,
        price:
          typeof live.price === "number" && Number.isFinite(live.price)
            ? live.price
            : row.price,
        change24hPct:
          typeof live.change_24h === "number" &&
          Number.isFinite(live.change_24h)
            ? live.change_24h
            : row.change24hPct,
      };
    });
  }, [livePrices, screener?.rows]);

  const visibleRows = useMemo(
    () => getVisibleScreenerRows(liveRows, MARKET_TERMINAL_DEFAULT_LIMIT),
    [liveRows],
  );

  const selectedAsset = useMemo(() => {
    return getSelectedAsset(liveRows, selectedAssetId);
  }, [liveRows, selectedAssetId]);

  const sortModel = useMemo(() => {
    const [columnId, direction] = sortPreset.split(":");
    return [
      {
        dim: { id: columnId },
        descending: direction !== "asc",
      },
    ];
  }, [sortPreset]);

  const filterFns = useMemo(() => {
    const filters = artifactData.filterModel ?? [];
    if (filters.length === 0) {
      return null;
    }

    return filters.map((filter) => {
      return (node: { data: MarketTerminalScreenerRow }) => {
        const value = node.data[filter.columnId as keyof MarketTerminalScreenerRow];
        if (filter.operator === "equals") {
          return (
            `${value ?? ""}`.toLowerCase() === `${filter.value}`.toLowerCase()
          );
        }
        if (filter.operator === "includes") {
          return `${value ?? ""}`
            .toLowerCase()
            .includes(`${filter.value}`.toLowerCase());
        }
        return true;
      };
    });
  }, [artifactData.filterModel]);

  const pivotModel = useMemo(() => {
    if (artifactData.pivotModel.rows.length > 0) {
      return {
        rows: artifactData.pivotModel.rows.map((item) => ({ id: item.id })),
        columns: artifactData.pivotModel.columns.map((item) => ({
          id: item.id,
        })),
        measures:
          artifactData.pivotModel.measures.length > 0
            ? artifactData.pivotModel.measures.map((measure) => ({
                dim: MARKET_TERMINAL_DIMENSIONS.find(
                  (column) => column.id === measure.id,
                ) ?? {
                  id: measure.id,
                  name: measure.id,
                  type: "number",
                },
                fn: measure.aggregator,
              }))
            : [
                {
                  dim:
                    MARKET_TERMINAL_DIMENSIONS.find(
                      (column) => column.id === "marketCap",
                    ) ??
                    ({
                      id: "marketCap",
                      name: "Market Cap",
                      type: "number",
                    } as const),
                  fn: "sum",
                },
              ],
      };
    }

    return {
      rows: [{ id: "chain" }],
      columns: [{ id: "narrative" }],
      measures: [
        {
          dim:
            MARKET_TERMINAL_DIMENSIONS.find(
              (column) => column.id === "marketCap",
            ) ??
            ({ id: "marketCap", name: "Market Cap", type: "number" } as const),
          fn: "sum",
        },
      ],
    };
  }, [artifactData.pivotModel]);

  const selectedAssetWatchlistItem = selectedAssetId
    ? `${selectedAssetId}`
    : null;

  const handleQueryCommit = () => {
    if (queryDraft === artifactData.query) {
      return;
    }

    persistArtifact({ query: queryDraft });
  };

  const handleChainChange = (nextChain: string) => {
    if (nextChain === chain) {
      return;
    }

    setChain(nextChain);
    if (nextChain !== artifactData.chain) {
      persistArtifact({ chain: nextChain });
    }
  };

  const handleSortChange = (nextValue: string) => {
    if (nextValue === sortPreset) {
      return;
    }

    setSortPreset(nextValue);

    const [columnId, direction] = nextValue.split(":");
    persistArtifact({
      sortModel: [
        {
          columnId,
          direction: direction === "asc" ? "asc" : "desc",
        },
      ],
    });
  };

  const handleViewChange = (value: string) => {
    const nextView =
      value === "pivot" ||
      value === "trade-tape" ||
      value === "review"
        ? value
        : "screener";

    if (nextView === activeView) {
      return;
    }

    setActiveView(nextView);
    if (nextView !== artifactData.initialView) {
      persistArtifact({ initialView: nextView });
    }
  };

  const saveSelectedPools = () => {
    const nextPools = normalizePoolsInput(poolDraft);
    if (areStringArraysEqual(nextPools, artifactData.selectedPools)) {
      return;
    }

    persistArtifact({ selectedPools: nextPools });
    toast.success(
      `Tracking ${nextPools.length} pool${nextPools.length === 1 ? "" : "s"}.`,
    );
  };

  const applyPivotPreset = (preset: "chain" | "narrative") => {
    if (preset === "chain") {
      persistArtifact({
        pivotModel: {
          rows: [{ id: "chain", label: "Chain" }],
          columns: [{ id: "narrative", label: "Narrative" }],
          measures: [{ id: "marketCap", aggregator: "sum" }],
        },
      });
      return;
    }

    persistArtifact({
      pivotModel: {
        rows: [{ id: "narrative", label: "Narrative" }],
        columns: [{ id: "chain", label: "Chain" }],
        measures: [{ id: "volume24h", aggregator: "sum" }],
      },
    });
  };

  const handleAnalyze = () => {
    if (!selectedAsset) {
      toast.error("Select an asset first.");
      return;
    }
    if (!chatActionsEnabled) {
      toast.error("Open the originating session to continue with the agent.");
      return;
    }

    emitTerminalChatHandoff(
      createMarketTerminalChatHandoff({
        action: "analyze",
        asset: selectedAsset,
        terminal: artifactData,
      }),
    );
  };

  const handleSwap = () => {
    if (!selectedAsset) {
      toast.error("Select an asset first.");
      return;
    }
    if (!chatActionsEnabled) {
      toast.error("Open the originating session to continue with the agent.");
      return;
    }

    emitTerminalChatHandoff(
      createMarketTerminalChatHandoff({
        action: "swap",
        asset: selectedAsset,
        terminal: artifactData,
      }),
    );
  };

  const handleWatchlist = async () => {
    if (!selectedAsset) {
      toast.error("Select an asset first.");
      return;
    }

    try {
      await addItem({
        assetId: selectedAsset.assetId,
        assetType: "crypto",
        symbol: selectedAsset.symbol,
        displayName: selectedAsset.name,
        source: "market-terminal",
        metadata: {
          chain: selectedAsset.chain,
          swapTarget: selectedAsset.swapTarget,
        },
      });
      toast.success(`${selectedAsset.symbol} added to watchlist.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to add watchlist item.",
      );
    }
  };

  const handleRowClick = (row: MarketTerminalScreenerRow) => {
    setSelectedAssetId(row.assetId);
    if (artifactData.selectedAssetIds[0] !== row.assetId) {
      persistArtifact({
        selectedAssetIds: [row.assetId],
      });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[20px] border border-border/60 bg-[#0b0d10]">
      <MarketTerminalHeader
        title={artifactData.title}
        universe={artifactData.universe}
        query={artifactData.query}
        quoteCurrency={artifactData.quoteCurrency}
        isPriceStreamConnected={isPriceStreamConnected}
        canAnalyze={artifactData.actions.canAnalyze}
        canWatchlist={artifactData.actions.canWatchlist}
        canSwap={artifactData.actions.canSwap}
        isWatchlistMutating={isMutating}
        onAnalyze={handleAnalyze}
        onWatchlist={handleWatchlist}
        onSwap={handleSwap}
      />

      <MarketTerminalControls
        queryDraft={queryDraft}
        chain={chain}
        sortPreset={sortPreset}
        onQueryChange={setQueryDraft}
        onQueryCommit={handleQueryCommit}
        onChainChange={handleChainChange}
        onSortChange={handleSortChange}
      />

      <MarketTerminalViewTabs
        activeView={activeView}
        onViewChange={handleViewChange}
      />

      {activeView === "pivot" ? (
        <MarketTerminalPivotPresets onApplyPreset={applyPivotPreset} />
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeView === "review" ? (
          <MarketTerminalReviewPanels
            artifactData={artifactData}
            selectedAsset={selectedAsset}
            selectedAssetWatchlistItem={selectedAssetWatchlistItem}
            liveRowCount={liveRows.length}
          />
        ) : isLoadingScreener ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading market terminal…
          </div>
        ) : screenerError ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-rose-300">
            {screenerError}
          </div>
        ) : activeView === "screener" ? (
          <MarketTerminalScreenerTable
            rows={visibleRows}
            selectedAssetId={selectedAssetId}
            totalRowCount={liveRows.length}
            onRowClick={handleRowClick}
          />
        ) : (
          <MarketTerminalAdvancedGrids
            activeView={activeView}
            liveRows={liveRows}
            pivotModel={pivotModel}
            sortModel={sortModel}
            filterFns={filterFns}
            effectivePools={effectivePools}
            selectedPoolsKey={selectedPoolsKey}
            poolDraft={poolDraft}
            onPoolDraftChange={setPoolDraft}
            onApplyPools={saveSelectedPools}
            onRowClick={handleRowClick}
          />
        )}
      </div>
    </div>
  );
}

export function MarketTerminalArtifactPanel() {
  const artifact = useMarketTerminalArtifact();
  const { upsertArtifact } = useArtifactRuntime();

  const data = useMemo(
    () => coerceMarketTerminalArtifactData(artifact.data),
    [artifact.data],
  );

  const handleArtifactChange = (next: MarketTerminalArtifactPayload) => {
    const now = Date.now();
    upsertArtifact("market-terminal", {
      id: "market-terminal-artifact",
      type: "market-terminal",
      status: "complete",
      version: now,
      createdAt: now,
      updatedAt: now,
      progress: 1,
      payload: next,
    });
  };

  return (
    <MarketTerminalArtifactSurface
      artifactData={data}
      onArtifactChange={handleArtifactChange}
      chatActionsEnabled={true}
    />
  );
}
