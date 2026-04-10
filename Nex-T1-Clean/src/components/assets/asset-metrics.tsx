"use client";

import { useLiveAsset } from "@/hooks/use-live-asset";
import { useAssetTradeData } from "@/lib/hooks/market/use-asset-metrics";
import { formatCurrency, cn } from "@/lib/utils";

export function AssetPriceDisplay({ 
  symbol, 
  chainId = "1", 
  address, 
  initialPrice = 0,
  className,
  priceOverride
}: { 
  symbol: string; 
  chainId?: string; 
  address?: string; 
  initialPrice?: number;
  className?: string;
  priceOverride?: number;
}) {
  const { price: fetchedPrice } = useLiveAsset(symbol, initialPrice, chainId, 0, address);
  
  const price = typeof priceOverride === 'number' ? priceOverride : fetchedPrice;
  
  return (
    <span className={cn("text-foreground font-mono font-normal", className)}>
      {price > 0 ? formatCurrency(price) : "$0.00"}
    </span>
  );
}

export function AssetChangeDisplay({ 
  symbol, 
  chainId = "1", 
  address, 
  initialChange24h = 0,
  className,
  changeOverride
}: { 
  symbol: string; 
  chainId?: string; 
  address?: string; 
  initialChange24h?: number;
  className?: string;
  changeOverride?: number;
}) {
  const { change24h: fetchedChange } = useLiveAsset(symbol, 0, chainId, initialChange24h, address);
  
  const change24h = typeof changeOverride === 'number' ? changeOverride : fetchedChange;
  
  const isPositive = change24h >= 0;
  
  return (
    <div className={cn(
      "flex items-center px-[8px] py-[2px] gap-[6px] h-[28px] rounded-full",
      isPositive ? "bg-emerald-500/10" : "bg-rose-500/10",
      className
    )}>
      <div className={cn(
          "w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px]",
          isPositive ? "border-b-emerald-500" : "border-t-[6px] border-b-0 border-t-rose-500"
      )} />
      <span className={cn(
          "text-[15.4px] font-mono font-normal leading-[24px]",
          isPositive ? "text-emerald-500" : "text-rose-500"
      )}>
          {Math.abs(change24h).toFixed(2)}%
      </span>
    </div>
  );
}

export function AssetVolumeDisplay({ 
  chainId = "1", 
  address,
  className 
}: { 
  chainId?: string; 
  address: string; 
  className?: string;
}) {
  const { data: tradeData } = useAssetTradeData(chainId, address);
  
  const volume = tradeData?.volume24h;
  
  return (
    <span className={cn("text-muted-foreground font-mono font-normal", className)}>
      {typeof volume === "number" ? formatCurrency(volume) : "-"}
    </span>
  );
}
