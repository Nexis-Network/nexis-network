"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { UnifiedFungibleAsset } from "@/types/wallet-unified";
import { Skeleton } from "@/components/ui/skeleton";

const BTC_PRICE_FALLBACK = 100_000;

async function fetchBtcPrice(): Promise<number> {
  try {
    const res = await fetch("/api/proxy/coingecko/simple/price?ids=bitcoin&vs_currencies=usd");
    if (!res.ok) return BTC_PRICE_FALLBACK;
    const data = (await res.json()) as { bitcoin?: { usd?: number } };
    return data?.bitcoin?.usd ?? BTC_PRICE_FALLBACK;
  } catch {
    return BTC_PRICE_FALLBACK;
  }
}

interface PortfolioNetWorthProps {
  totalNetWorthUsd: number;
  assets: UnifiedFungibleAsset[];
  isLoading?: boolean;
}

const ASSET_COLORS: Record<string, string> = {
  BTC: "#F7931A",
  ETH: "#627EEA",
  SOL: "#14F195",
  USDT: "#26A17B",
  USDC: "#2775CA",
  DAI: "#F5AC37",
  BNB: "#F3BA2F",
  MATIC: "#8247E5",
  WIN: "#3773f5",
  AVAX: "#E84142",
  DOT: "#E6007A",
  LINK: "#2A5ADA",
  UNI: "#FF007A",
  DOGE: "#C2A633",
  SHIB: "#FFA409",
  TRX: "#FF0013",
  ADA: "#0033AD",
  XRP: "#23292F",
};

const DEFAULT_COLORS = ["#A1A1A1", "#525252", "#ffffff", "#383838", "#6e6e6e"];

export function PortfolioNetWorth({ totalNetWorthUsd, assets, isLoading }: PortfolioNetWorthProps) {
  const { data: btcPrice } = useSWR("btc-price-simple", fetchBtcPrice, {
    refreshInterval: 300_000, // Refresh every 5 minutes
    fallbackData: BTC_PRICE_FALLBACK,
    dedupingInterval: 120_000,
  });

  const effectiveBtcPrice = btcPrice && btcPrice > 0 ? btcPrice : BTC_PRICE_FALLBACK;

  // Calculate Asset Allocation for the bar chart
  const allocation = useMemo(() => {
    if (!assets || assets.length === 0 || totalNetWorthUsd === 0) return [];

    // Sort by value desc
    const sorted = [...assets].sort((a, b) => (b.valueUsd || 0) - (a.valueUsd || 0));
    
    // Take top 5
    const top5 = sorted.slice(0, 5);
    const top5Value = top5.reduce((acc, curr) => acc + (curr.valueUsd || 0), 0);
    
    const othersValue = Math.max(0, totalNetWorthUsd - top5Value);
    
    const result = top5.map((asset, idx) => ({
      symbol: asset.symbol || "UNKNOWN",
      value: asset.valueUsd || 0,
      percent: ((asset.valueUsd || 0) / totalNetWorthUsd) * 100,
      color: ASSET_COLORS[asset.symbol?.toUpperCase() || ""] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
    }));

    if (othersValue > 0) {
      result.push({
        symbol: "OTHERS",
        value: othersValue,
        percent: (othersValue / totalNetWorthUsd) * 100,
        color: "#3A3A3A" // Dark grey for others
      });
    }

    return result;
  }, [assets, totalNetWorthUsd]);

  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalNetWorthUsd);

  if (isLoading) {
    return (
        <div className="w-full flex flex-col gap-6 py-4">
             <div className="space-y-2">
                 <Skeleton className="h-4 w-32 bg-muted" />
                 <Skeleton className="h-12 w-64 bg-muted" />
             </div>
             <Skeleton className="h-16 w-full rounded-2xl bg-muted" />
        </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-8 md:flex-row md:items-end md:justify-between py-6">
      {/* Left: Total Net Worth Text */}
      <div className="flex flex-col gap-1 min-w-[300px]">
        <p className="text-base text-muted-foreground font-medium">Total Net Worth</p>
        <div className="flex items-baseline gap-2">
            <h1 className="text-5xl font-semibold text-foreground tracking-tight leading-none">
                {formattedTotal}
            </h1>
            <span className="text-lg text-muted-foreground font-medium">USD</span>
        </div>
        
        <p className="text-sm text-muted-foreground mt-1">
             ≈ {(totalNetWorthUsd / effectiveBtcPrice).toFixed(4)} BTC
        </p>
         <div className="flex items-center gap-2 mt-4 text-[#8eb94f]/80">
            <span className="w-2 h-2 rounded-full bg-[#8eb94f] animate-pulse" />
            <span className="text-xs font-medium uppercase tracking-wider">Multi-chain Aggregated</span>
        </div>
      </div>

      {/* Right: Asset Allocation Bar & Legend */}
      <div className="flex-1 w-full max-w-2xl bg-transparent p-0">
          {/* Legend Top Row (as per screenshot style, symbols above bar?) 
              Screenshot shows symbols above bar for the segments. 
          */}
          <div className="flex justify-between items-end mb-3 px-1">
              {allocation.slice(0, 5).map((item) => (
                  <div key={item.symbol} className="flex items-center gap-1.5">
                      {/* Icon placeholder if needed, or just symbol */}
                      <span className="text-xs font-medium text-foreground">{item.symbol}</span>
                  </div>
              ))}
              {allocation.length > 5 && (
                 <span className="text-xs font-medium text-muted-foreground">OTHERS</span>
              )}
          </div>

          {/* Progress Bar Container */}
          <div className="flex w-full h-8 rounded-lg overflow-hidden gap-1 bg-transparent">
               {allocation.map((item) => (
                   <div 
                      key={item.symbol}
                      style={{ 
                          width: `${item.percent}%`,
                          backgroundColor: item.color
                      }}
                      className={cn(
                          "h-full first:rounded-l-sm last:rounded-r-sm hover:opacity-90 transition-opacity relative group",
                          // Add min-width to ensure visibility of small tiny assets if needed, or let them vanish
                          item.percent < 1 && "min-w-[4px]"  
                      )}
                      title={`${item.symbol}: ${item.percent.toFixed(2)}%`}
                   >
                       {/* Tooltip on hover */}
                       <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-neutral-900 border border-neutral-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                           ${item.value.toLocaleString()} ({item.percent.toFixed(2)}%)
                       </div>
                   </div>
               ))}
          </div>

          {/* Bottom Legend with Percentages */}
          <div className="flex justify-between items-start mt-4 px-1">
               {allocation.map((item) => (
                   <div key={item.symbol} className="flex flex-col gap-1">
                       <div className="flex items-center gap-2">
                           <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                           <span className="text-xs font-medium text-foreground">{item.symbol}</span>
                       </div>
                       <span className="text-[10px] text-muted-foreground font-mono ml-3.5">
                           {item.percent.toFixed(2)}%
                       </span>
                   </div>
               ))}
          </div>
      </div>
    </div>
  );
}
