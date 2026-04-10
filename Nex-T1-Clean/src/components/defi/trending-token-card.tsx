"use client";

import { memo } from "react";
import Image from "next/image";
import { CoingeckoTrendingItem } from "@/server/services/coingecko/coingecko-types";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface TrendingTokenCardProps {
  coin: CoingeckoTrendingItem["item"];
  onClick?: () => void;
}

export const TrendingTokenCard = memo(function TrendingTokenCard({ coin, onClick }: TrendingTokenCardProps) {
  const priceChange = coin.data.price_change_percentage_24h?.usd || 0;
  const isPositive = priceChange >= 0;

  return (
    <div 
      onClick={onClick}
      className="bg-[#0f0f10] border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-[120px] hover:border-white/10 hover:bg-[#131415] transition-all group cursor-pointer w-full"
    >
      {/* Top: Logo & Verified Badge */}
      <div className="flex justify-between items-start">
        <div className="relative">
           {coin.large ? (
             <Image src={coin.large} alt={coin.name} width={32} height={32} className="rounded-full bg-white/5 object-cover" unoptimized />
           ) : (
             <div className="flex size-8 items-center justify-center rounded-full bg-white/5 text-[10px] font-semibold uppercase text-white">
               {(coin.symbol ?? coin.name ?? "?").slice(0, 2)}
             </div>
           )}
           {coin.market_cap_rank && coin.market_cap_rank < 50 && (
             <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5">
               <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
             </div>
           )}
        </div>
      </div>

      {/* Middle/Bottom: Name & Market Cap & % */}
      <div className="flex flex-col mt-3 gap-1">
        <h3 className="text-white text-[13px] font-semibold truncate" title={coin.name}>{coin.name}</h3>
        
        <div className="flex items-center gap-2 mt-1">
          <span className="text-white text-lg font-medium tracking-tight">
            {coin.data.market_cap || "$0.00"}
          </span>
          
          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium ${
            isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          }`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(priceChange).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
});
