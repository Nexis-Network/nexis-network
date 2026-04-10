"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

import { useSwapStore } from "@/stores/use-swap-store";
import { useMarketStream } from "@/hooks/use-market-stream";

interface TokenStatsRowProps {
  className?: string;
}

export function TokenStatsRow({ className }: TokenStatsRowProps) {
  const [activeTab, setActiveTab] = useState("Details");
  const sellToken = useSwapStore((s) => s.sellToken);
  const tokenSymbol = sellToken?.symbol || "ETH";

  // useMarketStream accepts an array of coin IDs, fallback to symbol mapped
  const { data } = useMarketStream([tokenSymbol.toLowerCase()]);
  const coinData = data[tokenSymbol.toLowerCase()] || {};

  const formatCompact = (val?: number) => {
    if (!val) return "$--";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(val);
  };

  const formatPct = (val?: number) => {
    if (!val) return "--%";
    const sign = val >= 0 ? "+" : "";
    return `${sign}${val.toFixed(2)}%`;
  };

  const vol24h = formatCompact(coinData.vol_24h || 0); // Using standard stream volume
  const fdv = formatCompact((coinData.price || 0) * (sellToken?.decimals ? Math.pow(10, sellToken.decimals) : 1000000000)); // Rough fallback FDV estimation if true FDV missing in stream
  const change24h = formatPct(coinData.change_24h || 0);
  const isPositive = (coinData.change_24h || 0) >= 0;

  return (
    <div className={cn("flex flex-col w-full gap-6", className)}>
      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-4 px-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">FDV</span>
          <span className="font-mono text-sm text-white font-medium">{fdv !== "$0" ? fdv : "$--"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">1D Volume</span>
          <span className="font-mono text-sm text-white font-medium">{vol24h !== "$0" ? vol24h : "$--"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">1D FDV</span>
          <span className={`font-mono text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>{change24h}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">7D Volume</span>
          <span className="font-mono text-sm text-white font-medium">$--</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">7D FDV</span>
          <span className="font-mono text-sm text-gray-500 font-medium">--%</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-white/5 pb-0">
        {["Details", "Activity", "Holders"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-3 text-sm font-medium transition-colors relative",
              activeTab === tab ? "text-white" : "text-gray-400 hover:text-gray-300"
            )}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
