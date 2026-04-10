"use client";

import { FormEvent, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";

const CATEGORIES = ["All", "Buy", "Rent", "Usage"];

const CHAIN_FILTERS = [
  { id: "all", label: "All Chains", icon: null, chainId: "all" },
  { id: "ethereum", label: "Ethereum", icon: LIQUID_GLASS_LOGOS.ethereum, chainId: "eip155:1" },
  { id: "solana", label: "Solana", icon: LIQUID_GLASS_LOGOS.solana, chainId: "solana:101" },
  { id: "base", label: "Base", icon: "/icons/chain-icons/base.svg", chainId: "eip155:8453" },
  { id: "arbitrum", label: "Arbitrum", icon: "/icons/chain-icons/arbitrum.svg", chainId: "eip155:42161" },
  { id: "optimism", label: "Optimism", icon: "/icons/chain-icons/optimism.svg", chainId: "eip155:10" },
  { id: "polygon", label: "Polygon", icon: "/icons/chain-icons/polygon.svg", chainId: "eip155:137" },
  { id: "bnb", label: "BNB Chain", icon: LIQUID_GLASS_LOGOS.bnb, chainId: "eip155:56" },
  { id: "avalanche", label: "Avalanche", icon: "/icons/chain-icons/avalanche.svg", chainId: "eip155:43114" },
];

export function MarketNav() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") || "All";
  const activeChain = searchParams.get("chain") || "all";
  const activeQuery = searchParams.get("q") || "";
  const [queryInput, setQueryInput] = useState(activeQuery);

  useEffect(() => {
    setQueryInput(activeQuery);
  }, [activeQuery]);

  const pushMarketplace = (params: URLSearchParams) => {
    const query = params.toString();
    router.push(query ? `/marketplace?${query}` : "/marketplace");
  };

  const handleCategoryClick = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cat === "All") {
      params.delete("category");
    } else {
      params.set("category", cat);
    }
    pushMarketplace(params);
  };

  const handleChainClick = (chainId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (chainId === "all") {
      params.delete("chain");
    } else {
      params.set("chain", chainId);
    }
    pushMarketplace(params);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmedQuery = queryInput.trim();
    if (trimmedQuery.length === 0) {
      params.delete("q");
    } else {
      params.set("q", trimmedQuery);
    }
    pushMarketplace(params);
  };

  const handleSearchClear = () => {
    setQueryInput("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    pushMarketplace(params);
  };

  return (
    <div className="flex w-full flex-col gap-4 py-4 select-none sm:flex-row sm:items-center sm:justify-between overflow-hidden">
      {/* Categories Left */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mask-gradient pr-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryClick(cat)}
            className={cn(
              "whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-medium transition-all border shrink-0",
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border/60 hover:bg-accent hover:text-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearchSubmit} className="flex w-full items-center gap-2 sm:w-auto sm:min-w-[340px]">
        <label htmlFor="marketplace-agent-search" className="sr-only">
          Search marketplace agents
        </label>
        <input
          id="marketplace-agent-search"
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          className="h-9 w-full rounded-lg border border-border/60 bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none"
          placeholder="Search agents by name, slug, or description"
          autoComplete="off"
        />
        <button
          type="submit"
          className="h-9 rounded-lg border border-border/60 bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
        >
          Search
        </button>
        {activeQuery ? (
          <button
            type="button"
            onClick={handleSearchClear}
            className="h-9 rounded-lg border border-border/60 bg-transparent px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            Clear
          </button>
        ) : null}
      </form>

      {/* Chain Filters Right */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        {CHAIN_FILTERS.map((filter) => {
          const isActive = activeChain === filter.chainId || (filter.id === "all" && !activeChain);

          return (
            <button
              key={filter.id}
              onClick={() => handleChainClick(filter.chainId)}
              className={cn(
                "relative flex items-center justify-center transition-all border",
                isActive
                  ? "bg-accent border-border opacity-100"
                  : "bg-card border-border/60 hover:border-border opacity-60 hover:opacity-100",
                filter.id === "all"
                  ? "h-8 px-3 rounded-lg text-[11px] font-bold text-foreground"
                  : "w-8 h-8 rounded-lg"
              )}
              title={filter.label}
            >
              {filter.icon ? (
                <Image src={filter.icon} alt={filter.label} width={20} height={20} className="object-contain" />
              ) : (
                "All"
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
