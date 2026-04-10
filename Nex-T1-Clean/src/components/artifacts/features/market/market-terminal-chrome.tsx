"use client";

import {
  Activity,
  BarChart3,
  CandlestickChart,
  RefreshCcw,
  Search,
  Star,
  Workflow,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  MarketTerminalArtifactPayload,
  MarketTerminalScreenerRow,
} from "@/modules/shared/artifacts/market-terminal";

import {
  CHAIN_OPTIONS,
  SORT_PRESET_OPTIONS,
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from "./market-terminal-shared";
import { cn } from "@/lib/utils";

type MarketTerminalView = MarketTerminalArtifactPayload["initialView"];

type MarketTerminalHeaderProps = {
  title: string;
  universe: string;
  query: string;
  quoteCurrency: string;
  isPriceStreamConnected: boolean;
  canAnalyze: boolean;
  canWatchlist: boolean;
  canSwap: boolean;
  isWatchlistMutating: boolean;
  onAnalyze: () => void;
  onWatchlist: () => void;
  onSwap: () => void;
};

type MarketTerminalControlsProps = {
  queryDraft: string;
  chain: string;
  sortPreset: string;
  onQueryChange: (value: string) => void;
  onQueryCommit: () => void;
  onChainChange: (value: string) => void;
  onSortChange: (value: string) => void;
};

type MarketTerminalViewTabsProps = {
  activeView: MarketTerminalView;
  onViewChange: (value: string) => void;
};

type MarketTerminalPivotPresetsProps = {
  onApplyPreset: (preset: "chain" | "narrative") => void;
};

type MarketTerminalTradeTapeToolbarProps = {
  poolDraft: string;
  tradeRowCount: number;
  onPoolDraftChange: (value: string) => void;
  onApplyPools: () => void;
};

type MarketTerminalReviewPanelsProps = {
  artifactData: MarketTerminalArtifactPayload;
  selectedAsset: MarketTerminalScreenerRow | null;
  selectedAssetWatchlistItem: string | null;
  liveRowCount: number;
};

export function MarketTerminalHeader({
  title,
  universe,
  query,
  quoteCurrency,
  isPriceStreamConnected,
  canAnalyze,
  canWatchlist,
  canSwap,
  isWatchlistMutating,
  onAnalyze,
  onWatchlist,
  onSwap,
}: MarketTerminalHeaderProps) {
  return (
    <div className="border-b border-border/60 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <Badge variant="outline">{universe}</Badge>
            <Badge
              variant="outline"
              className={cn(
                isPriceStreamConnected
                  ? "border-emerald-500/40 text-emerald-300"
                  : "border-amber-500/40 text-amber-300",
              )}
            >
              {isPriceStreamConnected ? "Live prices" : "Snapshot"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Query: {query || "top crypto assets"} · Quote:{" "}
            {quoteCurrency.toUpperCase()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={onAnalyze}
            disabled={!canAnalyze}
          >
            <Search className="mr-1.5 h-3.5 w-3.5" />
            Analyze with agent
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onWatchlist}
            disabled={!canWatchlist || isWatchlistMutating}
          >
            <Star className="mr-1.5 h-3.5 w-3.5" />
            Add to watchlist
          </Button>
          <Button size="sm" onClick={onSwap} disabled={!canSwap}>
            <Workflow className="mr-1.5 h-3.5 w-3.5" />
            Swap with agent
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MarketTerminalControls({
  queryDraft,
  chain,
  sortPreset,
  onQueryChange,
  onQueryCommit,
  onChainChange,
  onSortChange,
}: MarketTerminalControlsProps) {
  return (
    <div className="border-b border-border/60 px-4 py-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
        <Input
          value={queryDraft}
          onChange={(event) => onQueryChange(event.target.value)}
          onBlur={onQueryCommit}
          placeholder="Filter universe, sector, narrative..."
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={chain}
          onChange={(event) => onChainChange(event.target.value)}
        >
          {CHAIN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={sortPreset}
          onChange={(event) => onSortChange(event.target.value)}
        >
          {SORT_PRESET_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function MarketTerminalViewTabs({
  activeView,
  onViewChange,
}: MarketTerminalViewTabsProps) {
  return (
    <div className="border-b border-border/60 px-4 py-2">
      <Tabs value={activeView} onValueChange={onViewChange}>
        <TabsList className="h-auto justify-start border-none">
          <TabsTrigger value="screener">
            <CandlestickChart className="mr-1.5 h-3.5 w-3.5" />
            Screener
          </TabsTrigger>
          <TabsTrigger value="pivot">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Pivot
          </TabsTrigger>
          <TabsTrigger value="trade-tape">
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            Trade tape
          </TabsTrigger>
          <TabsTrigger value="review">
            <Search className="mr-1.5 h-3.5 w-3.5" />
            Review
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

export function MarketTerminalPivotPresets({
  onApplyPreset,
}: MarketTerminalPivotPresetsProps) {
  return (
    <div className="border-b border-border/60 px-4 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Pivot preset</span>
        <Button size="sm" variant="outline" onClick={() => onApplyPreset("chain")}>
          By chain
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onApplyPreset("narrative")}
        >
          By narrative
        </Button>
      </div>
    </div>
  );
}

export function MarketTerminalTradeTapeToolbar({
  poolDraft,
  tradeRowCount,
  onPoolDraftChange,
  onApplyPools,
}: MarketTerminalTradeTapeToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
      <Input
        value={poolDraft}
        onChange={(event) => onPoolDraftChange(event.target.value)}
        placeholder="eth:0xpool, base:0xpool"
      />
      <Button size="sm" variant="outline" onClick={onApplyPools}>
        <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
        Apply pools
      </Button>
      <Badge variant="outline">{tradeRowCount} rows</Badge>
    </div>
  );
}

export function MarketTerminalReviewPanels({
  artifactData,
  selectedAsset,
  selectedAssetWatchlistItem,
  liveRowCount,
}: MarketTerminalReviewPanelsProps) {
  return (
    <div className="grid h-full gap-4 overflow-auto px-4 py-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-xl border border-border/60 bg-background/30 p-4">
        <h3 className="text-sm font-semibold">Terminal summary</h3>
        <div className="mt-3 grid gap-3 text-sm text-muted-foreground">
          <p>
            Active screen:{" "}
            <span className="text-foreground">
              {artifactData.query || "top crypto assets"}
            </span>
          </p>
          <p>
            Chain scope:{" "}
            <span className="text-foreground">{artifactData.chain}</span>
          </p>
          <p>
            Selected pools:{" "}
            <span className="text-foreground">
              {artifactData.selectedPools.length}
            </span>
          </p>
          <p>
            Live rows loaded: <span className="text-foreground">{liveRowCount}</span>
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-border/60 bg-background/30 p-4">
        <h3 className="text-sm font-semibold">Selected asset</h3>
        {selectedAsset ? (
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-sm font-medium text-foreground">
                {selectedAsset.symbol} · {selectedAsset.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedAsset.chain} · {formatCurrency(selectedAsset.price)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border/60 p-2">
                <div className="text-muted-foreground">24H</div>
                <div className="mt-1 text-foreground">
                  {formatPercent(selectedAsset.change24hPct)}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 p-2">
                <div className="text-muted-foreground">Market cap</div>
                <div className="mt-1 text-foreground">
                  {formatCompactCurrency(selectedAsset.marketCap)}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Watchlist key: {selectedAssetWatchlistItem}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Click a screener row to review an asset and hand it back to the agent.
          </p>
        )}
      </div>
    </div>
  );
}
