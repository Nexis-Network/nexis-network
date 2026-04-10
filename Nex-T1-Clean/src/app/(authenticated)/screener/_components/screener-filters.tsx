"use client";

import type { ReactElement } from "react";
import { Search, ShieldCheck, X } from "lucide-react";

import { NativeChainLogo } from "@/components/ui/native-chain-logo";
import { getPrimaryIcon } from "@/lib/token-icons";
import { cn } from "@/lib/utils";

import { useScreener } from "../_context/screener-context";

const CHAIN_OPTIONS = [
  { id: "all", name: "All Networks" },
  { id: "memes", name: "Memecoins" },
  { id: "solana", name: "Solana" },
  { id: "ethereum", name: "Ethereum" },
  { id: "base", name: "Base" },
  { id: "arbitrum", name: "Arbitrum" },
  { id: "optimism", name: "Optimism" },
  { id: "polygon", name: "Polygon" },
  { id: "avalanche", name: "Avalanche" },
  { id: "zksync", name: "ZkSync" },
  { id: "sui", name: "Sui" },
  { id: "bsc", name: "BSC" },
].map((chain) => {
  if (chain.id === "all") {
    return { ...chain, icon: "/assets/portfolio/all-networks.png" };
  }
  if (chain.id === "memes") {
    return {
      ...chain,
      icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/doge.svg",
    };
  }
  if (chain.id === "bsc") {
    return { ...chain, icon: "/icons/chain-icons/bnb-chain.svg" };
  }
  return { ...chain, icon: getPrimaryIcon({ name: chain.id, kind: "network" }) };
});

function resetButtonVisible(selectedChain: string, safetyFilter: boolean, narrativeFilter: string | null, searchQuery: string): boolean {
  return selectedChain !== "all" || safetyFilter || Boolean(narrativeFilter) || searchQuery.trim().length > 0;
}

export function ScreenerFilters(): ReactElement {
  const {
    selectedChain,
    setSelectedChain,
    searchQuery,
    setSearchQuery,
    narrativeFilter,
    setNarrativeFilter,
    safetyFilter,
    setSafetyFilter,
  } = useScreener();

  const showReset = resetButtonVisible(
    selectedChain,
    safetyFilter,
    narrativeFilter,
    searchQuery,
  );

  const handleReset = (): void => {
    setSelectedChain("all");
    setSafetyFilter(false);
    setNarrativeFilter(null);
    setSearchQuery("");
  };

  const handleClearSearch = (): void => {
    setSearchQuery("");
  };

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="relative flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1 pr-6 no-scrollbar mask-linear-fade">
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-10 bg-gradient-to-l from-card to-transparent" />
        {CHAIN_OPTIONS.map((chain) => {
          const isActive = selectedChain === chain.id;

          return (
            <button
              key={chain.id}
              type="button"
              onClick={() => setSelectedChain(chain.id)}
              aria-pressed={isActive}
              className={cn(
                "flex h-9 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-xs font-medium transition-colors",
                isActive
                  ? "border-[var(--settings-foreground-strong)] bg-[var(--settings-foreground-strong)] text-[var(--settings-surface)]"
                  : "border-[var(--settings-border-soft)] bg-transparent text-[var(--settings-foreground-subtle)] hover:bg-[var(--settings-elevated)] hover:text-[var(--settings-foreground-strong)]",
              )}
            >
              <NativeChainLogo
                src={chain.icon}
                alt={chain.name}
                className="h-4 w-4"
              />
              {chain.name}
            </button>
          );
        })}
      </div>

      <div className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row xl:items-center xl:justify-end">
        <div className="flex flex-wrap items-center gap-2 xl:border-l xl:border-[var(--settings-border-soft)] xl:pl-4">
          <button
            type="button"
            onClick={() => setSafetyFilter(!safetyFilter)}
            aria-pressed={safetyFilter}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full border px-4 text-xs font-medium transition-colors",
              safetyFilter
                ? "border-[var(--settings-accent)]/30 bg-[var(--settings-accent)]/12 text-[var(--settings-accent)] hover:bg-[var(--settings-accent)]/20"
                : "border-[var(--settings-border-soft)] bg-[var(--settings-elevated)] text-[var(--settings-foreground-subtle)] hover:bg-[var(--settings-border-soft)] hover:text-[var(--settings-foreground-strong)]",
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Safe
          </button>

          {narrativeFilter ? (
            <button
              type="button"
              onClick={() => setNarrativeFilter(null)}
              className="group flex h-9 items-center gap-2 rounded-full border border-[var(--settings-accent)]/30 bg-[var(--settings-accent)]/12 px-4 text-xs font-medium text-[var(--settings-accent)] transition-colors hover:bg-[var(--settings-accent)]/20"
            >
              <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--settings-accent)]/70">
                Category
              </span>
              <span>{narrativeFilter}</span>
              <X className="h-3.5 w-3.5 opacity-60 transition-opacity group-hover:opacity-100" />
            </button>
          ) : null}

          {showReset ? (
            <button
              type="button"
              onClick={handleReset}
              className="flex h-9 items-center rounded-full border border-transparent px-3 text-xs font-medium text-[var(--settings-foreground-subtle)] transition-colors hover:border-[var(--settings-border-soft)] hover:bg-[var(--settings-elevated)] hover:text-[var(--settings-foreground-strong)]"
            >
              Clear all
            </button>
          ) : null}
        </div>

        <label className="flex h-9 w-full items-center gap-2 rounded-full border border-[var(--settings-border-soft)] bg-[var(--settings-elevated)] px-3 text-[var(--settings-foreground-subtle)] transition-colors focus-within:border-[var(--settings-accent)]/40 focus-within:text-[var(--settings-foreground-strong)] xl:w-[240px] xl:shrink-0">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full border-none bg-transparent text-xs text-[var(--settings-foreground-strong)] focus:outline-none placeholder:text-[var(--settings-foreground-subtle)]"
            placeholder="Search assets"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--settings-foreground-subtle)] transition-colors hover:bg-[var(--settings-border-soft)] hover:text-[var(--settings-foreground-strong)]"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </label>
      </div>
    </div>
  );
}
