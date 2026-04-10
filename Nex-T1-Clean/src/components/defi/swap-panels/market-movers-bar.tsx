"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Flame } from "lucide-react";
import Image from "next/image";

interface MoverCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  priceChangePercent: number;
}

function useTrendingMovers() {
  const [movers, setMovers] = useState<MoverCoin[]>([]);

  useEffect(() => {
    let mounted = true;

    async function fetchMovers() {
      try {
        const res = await fetch("/api/proxy/coingecko/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&sparkline=false&price_change_percentage=24h");
        if (!res.ok) return;
        const data: {
          id: string;
          symbol: string;
          name: string;
          image: string;
          price_change_percentage_24h: number;
        }[] = await res.json();
        if (!mounted || !Array.isArray(data)) return;

        // Sort by absolute price change to get biggest movers
        const sorted = [...data]
          .sort((a, b) => Math.abs(b.price_change_percentage_24h ?? 0) - Math.abs(a.price_change_percentage_24h ?? 0))
          .slice(0, 20)
          .map((c) => ({
            id: c.id,
            symbol: c.symbol.toUpperCase(),
            name: c.name,
            image: c.image,
            priceChangePercent: c.price_change_percentage_24h ?? 0,
          }));

        setMovers(sorted);
      } catch {
        // Silently fail
      }
    }

    fetchMovers();
    const interval = setInterval(fetchMovers, 300_000); // 5 min — conserve CoinGecko API credits
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return movers;
}

export function MarketMoversBar() {
  const movers = useTrendingMovers();

  // Duplicate for infinite scroll effect
  const displayItems = movers.length > 0 ? [...movers, ...movers, ...movers] : [];

  return (
    <div className="flex h-[44px] w-full items-center gap-0 border-b border-white/[0.06] bg-[#0f0f10]">
      {/* Market Movers dropdown button — icon-only on mobile, full label on sm+ */}
      <button className="flex h-full flex-shrink-0 items-center gap-[6px] border-r border-white/[0.06] px-2.5 sm:px-4 text-[12px] font-medium text-white transition-colors hover:bg-white/[0.03]">
        <Flame className="h-[14px] w-[14px] text-[#F97316]" />
        <span className="hidden sm:inline">Market Movers</span>
        <ChevronDown className="h-[12px] w-[12px] text-gray-500 hidden sm:block" />
      </button>

      {/* Scrolling ticker region */}
      <div className="relative flex-1 overflow-hidden">
        {/* Edge fade */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 sm:w-16 bg-gradient-to-r from-[#0f0f10] to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 sm:w-16 bg-gradient-to-l from-[#0f0f10] to-transparent" />

        <div className="flex animate-ticker-scroll items-center gap-0 hover:[animation-play-state:paused]">
          {displayItems.map((coin, i) => {
            const isPositive = coin.priceChangePercent >= 0;
            return (
              <div
                key={`${coin.id}-${i}`}
                className="flex h-[44px] flex-shrink-0 items-center gap-[6px] sm:gap-[8px] border-r border-white/[0.04] px-3 sm:px-5"
              >
                <span className="text-[11px] font-mono text-gray-500 hidden sm:inline">
                  #{(i % movers.length) + 1}
                </span>
                <div className="relative h-[16px] w-[16px] flex-shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={coin.image}
                    alt={coin.symbol}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <span className="text-[11px] sm:text-[12px] font-medium text-white">
                  {coin.symbol}
                </span>
                <span
                  className={cn(
                    "text-[11px] sm:text-[12px] font-mono font-medium",
                    isPositive ? "text-[#0ea5e9]" : "text-[#ef4444]"
                  )}
                >
                  {isPositive ? "+" : ""}
                  {coin.priceChangePercent.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Wallet address pill — hidden on mobile to save space */}
      <div className="hidden md:flex h-full flex-shrink-0 items-center gap-3 border-l border-white/[0.06] px-4">
        <div className="flex h-[28px] items-center gap-2 rounded-full border border-white/[0.08] bg-[#141415] px-3">
          <span className="text-[11px] font-mono text-gray-300">
            0x4F1dtd9...B2A
          </span>
        </div>
      </div>
    </div>
  );
}
