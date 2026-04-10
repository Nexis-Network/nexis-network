"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Grid3X3, List, Search, SlidersHorizontal, Star } from "lucide-react";

import { CAMPAIGN_CHAIN_OPTIONS } from "@/components/agents/agent-campaign-manager.types";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import {
  defaultSortForView,
  type LaunchesCategory,
  type LaunchesChainFamily,
  type LaunchesFdv,
  type LaunchesView,
  type LaunchesViewMode,
} from "@/lib/launchpad/filters";
import { cn } from "@/lib/utils";

const VIEW_TABS: Array<{ value: LaunchesView; label: string }> = [
  { value: "trending", label: "Trending" },
  { value: "top", label: "Top" },
  { value: "watchlist", label: "Watchlist" },
  { value: "new", label: "New" },
];

const CATEGORY_OPTIONS: Array<{ value: LaunchesCategory; label: string }> = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "finalized", label: "Finalized" },
  { value: "draft", label: "Draft" },
  { value: "erc404", label: "ERC-404" },
];

const PRIMARY_CHAIN_OPTIONS: Array<{ value: LaunchesChainFamily; label: string }> = [
  { value: "all", label: "All" },
  { value: "evm", label: "Ethereum" },
  { value: "solana", label: "Solana" },
];

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "progress", label: "Most Progress" },
  { value: "raised", label: "Highest Raised" },
  { value: "newest", label: "Newest" },
  { value: "closing", label: "Closing Soon" },
  { value: "risk-low", label: "Risk Low → High" },
  { value: "risk-high", label: "Risk High → Low" },
];

const CHAIN_ICON_BY_REF: Record<string, string> = {
  "eip155:8453": "/icons/chain-icons/base.svg",
  "eip155:1": LIQUID_GLASS_LOGOS.ethereum,
  "eip155:10": "/icons/chain-icons/optimism.svg",
  "eip155:42161": "/icons/chain-icons/arbitrum.svg",
  "solana:101": LIQUID_GLASS_LOGOS.solana,
};

const SUPPORTED_LAUNCHPAD_CHAINS = CAMPAIGN_CHAIN_OPTIONS.map((chain) => ({
  label: chain.label,
  chainRef: chain.chainRef,
  iconSrc: CHAIN_ICON_BY_REF[chain.chainRef] ?? LIQUID_GLASS_LOGOS.ethereum,
}));

const FDV_OPTIONS: Array<{ value: LaunchesFdv; label: string }> = [
  { value: "lt100k", label: "< $100K" },
  { value: "100k-500k", label: "$100K - $500K" },
  { value: "500k-1m", label: "$500K - $1M" },
  { value: "1m-10m", label: "$1M - $10M" },
  { value: "10m-100m", label: "$10M - $100M" },
  { value: "100m-1b", label: "$100M - $1B" },
  { value: "gt1b", label: "$1B+" },
];

type LaunchesNavProps = {
  counts: Record<LaunchesCategory, number>;
  viewCounts: Record<LaunchesView, number>;
  children?: ReactNode;
};

export function LaunchesNav({ counts, viewCounts, children }: LaunchesNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = (searchParams.get("view") ?? "trending").toLowerCase() as LaunchesView;
  const activeCategory = (searchParams.get("category") ?? "all").toLowerCase() as LaunchesCategory;
  const activeChain = (searchParams.get("chainFamily") ?? "all").toLowerCase() as LaunchesChainFamily;
  const activeFdv = (searchParams.get("fdv") ?? "all").toLowerCase() as LaunchesFdv;
  const activeSort = (searchParams.get("sort") ?? defaultSortForView(activeView)).toLowerCase();
  const activeQuery = searchParams.get("q") ?? "";
  const activeHasNft = parseBooleanQueryParam(searchParams.get("hasNft"));
  const activeBrandedTokenPage = parseBooleanQueryParam(searchParams.get("brandedTokenPage"));
  const activeViewModeRaw = (searchParams.get("viewMode") ?? "rows").toLowerCase();
  const activeViewMode: LaunchesViewMode = activeViewModeRaw === "cards" ? "cards" : "rows";
  const [queryInput, setQueryInput] = useState(activeQuery);
  const [chainSearchInput, setChainSearchInput] = useState("");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isChainsOpen, setIsChainsOpen] = useState(true);
  const [isFdvOpen, setIsFdvOpen] = useState(true);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  useEffect(() => {
    setQueryInput(activeQuery);
  }, [activeQuery]);

  useEffect(() => {
    setIsMobileFiltersOpen(false);
  }, [activeView, activeCategory, activeChain, activeSort, activeQuery, activeHasNft, activeBrandedTokenPage, activeViewMode]);

  const pushLaunches = (params: URLSearchParams) => {
    const query = params.toString();
    router.push(query ? `/launches?${query}` : "/launches");
  };

  const updateParam = (key: string, value: string, defaultValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === defaultValue) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    pushLaunches(params);
  };

  const updateBooleanParam = (key: string, enabled: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (enabled) {
      params.set(key, "1");
    } else {
      params.delete(key);
    }
    pushLaunches(params);
  };

  const activeFilterCount = useMemo<number>(() => {
    let total = 0;
    if (activeCategory !== "all") total += 1;
    if (activeChain !== "all") total += 1;
    if (activeFdv !== "all") total += 1;
    if (activeSort !== defaultSortForView(activeView)) total += 1;
    if (activeQuery.trim()) total += 1;
    if (activeHasNft) total += 1;
    if (activeBrandedTokenPage) total += 1;
    return total;
  }, [activeCategory, activeChain, activeFdv, activeQuery, activeSort, activeView, activeHasNft, activeBrandedTokenPage]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmedQuery = queryInput.trim();
    if (trimmedQuery.length === 0) {
      params.delete("q");
    } else {
      params.set("q", trimmedQuery);
    }
    pushLaunches(params);
  };

  const handleSearchClear = () => {
    setQueryInput("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    pushLaunches(params);
  };

  const visibleChains = useMemo(() => {
    const normalized = chainSearchInput.trim().toLowerCase();
    if (normalized.length === 0) return SUPPORTED_LAUNCHPAD_CHAINS;
    return SUPPORTED_LAUNCHPAD_CHAINS.filter((chain) => {
      return chain.label.toLowerCase().includes(normalized) || chain.chainRef.toLowerCase().includes(normalized);
    });
  }, [chainSearchInput]);

  const handleViewChange = (view: LaunchesView) => {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "trending") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    params.set("sort", defaultSortForView(view));
    pushLaunches(params);
  };

  const sidebarPanel = (
    <div className="h-full overflow-y-auto pb-10">
      <div className="flex items-center justify-between px-6 py-4 xl:hidden">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#ACADAE]">Filters</p>
        <button
          type="button"
          onClick={() => setIsMobileFiltersOpen(false)}
          className="rounded-md border border-[#26272D] px-2 py-1 text-xs text-white/75"
        >
          Close
        </button>
      </div>

      <div className="px-6 pb-4 xl:pt-4">
        <p className="pb-4 text-[13.7px] leading-[21px] text-white">Filter By</p>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-[#26272D] bg-[#141415] px-2.5 text-[13.6px] text-[#ACADAE]"
          >
            <Star className="size-4" />
            Collections
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-[#34353C] bg-[#1B1D1F] px-2.5 text-[13.5px] font-medium text-white"
          >
            <List className="size-4" />
            Tokens
          </button>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      <div className="px-6 py-4">
        <button
          type="button"
          onClick={() => setIsChainsOpen((prev) => !prev)}
          className="flex h-8 w-full items-center justify-between text-left text-[13.8px] text-white"
        >
          <span>Chains</span>
          <ChevronDown className={cn("size-4 transition-transform", isChainsOpen && "rotate-180")} />
        </button>

        {isChainsOpen ? (
          <div className="mt-3 space-y-3">
            <div className="flex h-8 items-center rounded-md border border-[#26272D] bg-[#141415] pl-2 pr-3">
              <Search className="size-4 text-[#ACADAE]" />
              <input
                value={chainSearchInput}
                onChange={(event) => setChainSearchInput(event.target.value)}
                className="h-full w-full bg-transparent pl-2 text-[13.3px] text-white placeholder:text-[#ACADAE] focus:outline-none"
                placeholder="Search for chains"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {PRIMARY_CHAIN_OPTIONS.map((option) => {
                const isActive = activeChain === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateParam("chainFamily", option.value, "all")}
                    className={cn(
                      "inline-flex h-7 items-center justify-center rounded-md border px-2.5 text-[13.3px]",
                      isActive
                        ? "border-[#34353C] bg-[#1B1D1F] font-medium text-white"
                        : "border-[#26272D] bg-[#141415] text-[#ACADAE]",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
              {visibleChains.map((chain) => (
                <span
                  key={chain.chainRef}
                  className="inline-flex h-7 items-center justify-center gap-1.5 rounded-md border border-[#26272D] bg-[#141415] px-2.5 text-[13.3px] text-[#ACADAE]"
                >
                  <Image src={chain.iconSrc} alt={`${chain.label} logo`} width={15} height={15} className="rounded-full" />
                  {chain.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="h-px bg-white/10" />

      <div className="px-6 py-4">
        <button
          type="button"
          onClick={() => setIsFdvOpen((prev) => !prev)}
          className="flex h-8 w-full items-center justify-between text-left text-[13.8px] text-white"
        >
          <span>FDV</span>
          <ChevronDown className={cn("size-4 transition-transform", isFdvOpen && "rotate-180")} />
        </button>
        {isFdvOpen ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {FDV_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateParam("fdv", option.value, "all")}
                className={cn(
                  "inline-flex h-7 items-center justify-center rounded-md border px-2.5 text-[13.3px]",
                  activeFdv === option.value
                    ? "border-[#34353C] bg-[#1B1D1F] font-medium text-white"
                    : "border-[#26272D] bg-[#141415] text-[#ACADAE]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="h-px bg-white/10" />

      <div className="px-6 py-4">
        <button
          type="button"
          onClick={() => setIsCategoryOpen((prev) => !prev)}
          className="flex h-8 w-full items-center justify-between text-left text-[13.3px] text-[#ACADAE]"
        >
          <span>Category</span>
          <ChevronDown className={cn("size-4 transition-transform", isCategoryOpen && "rotate-180")} />
        </button>
        {isCategoryOpen ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((category) => {
                const isActive = activeCategory === category.value;
                return (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => updateParam("category", category.value, "all")}
                    className={cn(
                      "inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-[13.1px]",
                      isActive
                        ? "border-[#34353C] bg-[#1B1D1F] text-white"
                        : "border-[#26272D] bg-[#141415] text-[#ACADAE]",
                    )}
                  >
                    <span>{category.label}</span>
                    <span className="text-[11px] text-white/55">{counts[category.value]}</span>
                  </button>
                );
              })}
            </div>
            <label htmlFor="launches-sort" className="block text-[11px] uppercase tracking-[0.12em] text-[#ACADAE]">
              Sort
            </label>
            <select
              id="launches-sort"
              value={activeSort}
              onChange={(event) => updateParam("sort", event.target.value, defaultSortForView(activeView))}
              className="h-8 w-full rounded-md border border-[#26272D] bg-[#141415] px-2 text-[13px] text-white focus:outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="h-px bg-white/10" />

      <div className="space-y-4 px-6 py-4">
        <button
          type="button"
          onClick={() => updateBooleanParam("hasNft", !activeHasNft)}
          aria-pressed={activeHasNft}
          className="flex w-full items-center justify-between text-[13.3px] text-[#ACADAE]"
        >
          <span>Has NFT</span>
          <span className={cn("flex h-5 w-10 items-center rounded-full p-0.5 transition-colors", activeHasNft ? "bg-[#0FB983]" : "bg-[#26272D]")}>
            <span className={cn("size-4 rounded-full bg-white transition-transform", activeHasNft ? "translate-x-5" : "translate-x-0")} />
          </span>
        </button>
        <button
          type="button"
          onClick={() => updateBooleanParam("brandedTokenPage", !activeBrandedTokenPage)}
          aria-pressed={activeBrandedTokenPage}
          className="flex w-full items-center justify-between text-[13.1px] text-[#ACADAE]"
        >
          <span>Branded Token Page</span>
          <span className={cn("flex h-5 w-10 items-center rounded-full p-0.5 transition-colors", activeBrandedTokenPage ? "bg-[#0FB983]" : "bg-[#26272D]")}>
            <span className={cn("size-4 rounded-full bg-white transition-transform", activeBrandedTokenPage ? "translate-x-5" : "translate-x-0")} />
          </span>
        </button>

        <form onSubmit={handleSearchSubmit} className="space-y-2">
          <label htmlFor="launches-search" className="text-[11px] uppercase tracking-[0.12em] text-[#ACADAE]">
            Search launches
          </label>
          <div className="flex h-8 items-center rounded-md border border-[#26272D] bg-[#141415] pl-2 pr-3">
            <Search className="size-4 text-[#ACADAE]" />
            <input
              id="launches-search"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              className="h-full w-full bg-transparent pl-2 text-[13.3px] text-white placeholder:text-[#ACADAE] focus:outline-none"
              placeholder="Search launches"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="sr-only">
            Search
          </button>
          {activeQuery ? (
            <button type="button" onClick={handleSearchClear} className="sr-only">
              Clear
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );

  return (
    <section className="relative flex min-h-full w-full bg-[#141415] text-white">
      {isMobileFiltersOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/60 xl:hidden"
          aria-label="Close filters"
          onClick={() => setIsMobileFiltersOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[320px] border-r border-[#26272D] bg-[#141415] transition-transform xl:sticky xl:top-0 xl:z-10 xl:h-full",
          isMobileFiltersOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0",
        )}
      >
        {sidebarPanel}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-[#141415] xl:pl-0">
        <div className="sticky top-0 z-20 border-b border-[#26272D] bg-[#141415]">
          <div className="flex h-16 items-center gap-3 px-4 xl:px-6">
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(true)}
              className="inline-flex size-8 items-center justify-center rounded-md border border-[#26272D] text-white xl:hidden"
            >
              <SlidersHorizontal className="size-4" />
            </button>
            <button
              type="button"
              className="hidden size-8 items-center justify-center rounded-md border border-[#26272D] text-white xl:inline-flex"
              aria-label="Filters"
            >
              <SlidersHorizontal className="size-4" />
            </button>

            <div className="flex items-center gap-2">
              {VIEW_TABS.map((tab) => {
                const isActive = activeView === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => handleViewChange(tab.value)}
                    className={cn(
                      "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2.5 text-[13.3px] transition-colors",
                      isActive
                        ? "border-[#34353C] bg-[#1B1D1F] font-medium text-white"
                        : "border-[#26272D] bg-[#141415] text-[#ACADAE] hover:text-white",
                    )}
                  >
                    <span>{tab.label}</span>
                    <span className="text-[11px] text-white/60">{viewCounts[tab.value]}</span>
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <div className="hidden items-center rounded-md border border-[#26272D] bg-white/[0.02] px-2 py-1 text-[11px] text-[#ACADAE] sm:inline-flex">
                {activeFilterCount} filters
              </div>
              <button
                type="button"
                onClick={() => updateParam("viewMode", "rows", "rows")}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-md border",
                  activeViewMode === "rows"
                    ? "border-[#34353C] bg-white/[0.02] text-white"
                    : "border-[#26272D] text-[#ACADAE]",
                )}
                aria-label="Rows view"
              >
                <List className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => updateParam("viewMode", "cards", "rows")}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-md border",
                  activeViewMode === "cards"
                    ? "border-[#34353C] bg-white/[0.02] text-white"
                    : "border-[#26272D] text-[#ACADAE]",
                )}
                aria-label="Card view"
              >
                <Grid3X3 className="size-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">{children}</div>
      </div>
    </section>
  );
}

function parseBooleanQueryParam(value: string | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}
