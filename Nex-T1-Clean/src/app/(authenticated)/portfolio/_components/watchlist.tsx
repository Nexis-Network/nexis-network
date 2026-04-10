"use client";

import { ArrowRight, X } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useWatchlist } from "@/lib/hooks/watchlist/use-watchlist";


import { logger } from '@/lib/logger';
export function Watchlist() {
  const { items, removeItem, isLoading } = useWatchlist("usd");

  const handleRemove = async (itemId: string) => {
    try {
      await removeItem(itemId);
    } catch (error) {
      logger.error("Failed to remove item", error);
    }
  };

  if (isLoading) {
      return (
        <div className="flex flex-col gap-4 w-full animate-pulse">
            <div className="h-4 w-24 rounded bg-accent/50" />
            <div className="flex flex-col gap-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 w-full rounded-lg bg-accent/50" />
                ))}
            </div>
        </div>
      );
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
         <div className="flex flex-col">
            <h3 className="text-sm font-medium text-foreground">Watchlist</h3>
            <span className="text-xs text-muted-foreground">{items.length} assets</span>
         </div>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => {
            const price = item.quote?.price ?? 0;
            const change = item.quote?.priceChangePct ?? 0;
            const isPositive = change >= 0;
            const symbol = item.symbol || item.assetId;
            const name = item.displayName || symbol;

            const formattedPrice = new Intl.NumberFormat("en-US", { 
                style: "currency", 
                currency: "USD",
                minimumFractionDigits: price < 1 ? 4 : 2,
                maximumFractionDigits: price < 1 ? 6 : 2
            }).format(price);

            const formattedChange = `${isPositive ? "+" : ""}${change.toFixed(2)}%`;

            return (
              <div 
                key={item.id} 
                className="group relative -mx-2 flex cursor-pointer items-center justify-between rounded-lg border border-transparent p-2 transition-colors hover:border-border/60 hover:bg-accent/30"
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-transparent p-0 shadow-sm">
                    {item.quote?.imageUrl ? (
                       <Image 
                         src={item.quote.imageUrl} 
                         alt={symbol} 
                         width={32} 
                         height={32} 
                         className="w-full h-full object-cover" 
                         unoptimized
                       />
                    ) : (
                       <div className="flex h-full w-full items-center justify-center bg-primary/15 text-[10px] font-bold text-primary">
                          {symbol[0]?.toUpperCase()}
                       </div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span className="line-clamp-1 text-sm font-medium text-foreground">{name}</span>
                    <span className="text-xs text-muted-foreground">{symbol}</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end group-hover:opacity-0 transition-opacity duration-200">
                   <span className="text-xs font-medium text-foreground">{price > 0 ? formattedPrice : "-"}</span>
                   <span className={cn("text-[10px] font-medium", isPositive ? "text-green-500" : "text-red-500")}>
                      {change !== 0 ? formattedChange : "-"}
                   </span>
                </div>

                {/* Remove Button - Visible on hover, replaces price info */}
                <button
                   onClick={(e) => {
                     e.stopPropagation();
                     handleRemove(item.id);
                   }}
                   className="absolute right-2 rounded-full p-1.5 text-muted-foreground opacity-0 transition-all duration-200 hover:bg-accent hover:text-foreground group-hover:opacity-100"
                   aria-label="Remove from watchlist"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
        })}
      </div>

      <button className="mt-2 flex w-fit items-center justify-center gap-2 rounded-full border border-border/60 bg-transparent px-4 py-2 text-xs font-medium text-foreground transition-all hover:bg-accent/40 self-start">
        Manage watchlist
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
