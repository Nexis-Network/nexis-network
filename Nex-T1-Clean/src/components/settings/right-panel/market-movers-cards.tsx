"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Image from "next/image";

import { BentoCard, BentoCardHeader } from "../shared/bento-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MarketToken {
  id: string;
  chain: string;
  address: string;
  symbol: string;
  name: string;
  logoUrl?: string;
  priceUsd: number;
  priceChange24hPercent: number;
}

function useMarketTokens(type: "gainers" | "losers") {
  return useQuery({
    queryKey: [`market-${type}`],
    queryFn: async () => {
      const res = await fetch(`/api/tools/market/${type}?limit=4`);
      if (!res.ok) throw new Error(`Failed to fetch ${type}`);
      const json = await res.json();
      const items = Array.isArray(json?.data?.items) ? json.data.items : [];
      return items as MarketToken[];
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

function TokenRow({ token, type }: { token: MarketToken; type: "gainer" | "loser" }) {
  const isGainer = type === "gainer";

  return (
    <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        {token.logoUrl ? (
          <Image src={token.logoUrl} alt={token.symbol} width={24} height={24} className="rounded-full" unoptimized />
        ) : (
          <div className="size-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-[var(--bento-text-primary)] uppercase">
            {token.symbol?.slice(0, 1)}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-[var(--bento-text-primary)] text-sm font-medium truncate uppercase w-16">
            {token.symbol}
          </span>
          <span className="text-[10px] text-[var(--bento-text-muted)] truncate capitalize w-16">
            {token.name}
          </span>
        </div>
      </div>
      
      <div className="flex flex-col items-end min-w-0">
        <span className="text-[var(--bento-text-primary)] text-sm font-mono font-normal">
          ${token.priceUsd.toFixed(4)}
        </span>
        <div 
          className={cn(
            "flex items-center gap-0.5 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md transition-all",
            isGainer 
              ? "text-[#ADE25D] bg-[#ADE25D]/10" 
              : "text-[#f95200] bg-[#f95200]/10"
          )}
        >
          {isGainer ? (
            <ArrowUpRight className="size-3" data-inherit-color />
          ) : (
            <ArrowDownRight className="size-3" data-inherit-color />
          )}
          {Math.abs(token.priceChange24hPercent).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export function TopGainersCard() {
  const { data: gainers, isLoading } = useMarketTokens("gainers");
  const safeGainers = Array.isArray(gainers) ? gainers : [];

  return (
    <BentoCard>
      <BentoCardHeader title="Top Gainers" status="online" action={<TrendingUp className="size-4 text-[#c7c7cc]" />} />
      <div className="space-y-1">
        {isLoading ? (
           Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="flex items-center justify-between p-2">
               <div className="flex items-center gap-3">
                 <Skeleton className="size-6 rounded-full bg-white/5" />
                 <div className="space-y-1">
                   <Skeleton className="h-3 w-10 bg-white/5" />
                   <Skeleton className="h-2 w-14 bg-white/5" />
                 </div>
               </div>
               <div className="space-y-1 items-end flex flex-col">
                 <Skeleton className="h-3 w-12 bg-white/5" />
                 <Skeleton className="h-2 w-8 bg-white/5" />
               </div>
             </div>
           ))
        ) : safeGainers.length ? (
          safeGainers.map((t) => <TokenRow key={t.id} token={t} type="gainer" />)
        ) : (
          <p className="text-xs text-[var(--bento-text-muted)] p-2 text-center">No gainers available.</p>
        )}
      </div>
    </BentoCard>
  );
}

export function TopLosersCard() {
  const { data: losers, isLoading } = useMarketTokens("losers");
  const safeLosers = Array.isArray(losers) ? losers : [];

  return (
    <BentoCard>
      <BentoCardHeader title="Top Losers" status="online" action={<TrendingDown className="size-4 text-[#c7c7cc]" />} />
      <div className="space-y-1">
        {isLoading ? (
           Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="flex items-center justify-between p-2">
               <div className="flex items-center gap-3">
                 <Skeleton className="size-6 rounded-full bg-white/5" />
                 <div className="space-y-1">
                   <Skeleton className="h-3 w-10 bg-white/5" />
                   <Skeleton className="h-2 w-14 bg-white/5" />
                 </div>
               </div>
               <div className="space-y-1 items-end flex flex-col">
                 <Skeleton className="h-3 w-12 bg-white/5" />
                 <Skeleton className="h-2 w-8 bg-white/5" />
               </div>
             </div>
           ))
        ) : safeLosers.length ? (
          safeLosers.map((t) => <TokenRow key={t.id} token={t} type="loser" />)
        ) : (
          <p className="text-xs text-[var(--bento-text-muted)] p-2 text-center">No losers available.</p>
        )}
      </div>
    </BentoCard>
  );
}
