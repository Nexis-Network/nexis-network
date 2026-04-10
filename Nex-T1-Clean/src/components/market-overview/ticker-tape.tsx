"use client";

import { cn } from "@/lib/utils";
import { useTopGainersLosers } from "@/hooks/market/use-market-overview";
import { formatCurrency, formatPercentage } from "@/modules/prices/market-overview/formatters";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function TickerTape({ currency: _currency = "usd" }: { currency?: string }) {
    const chain = "0x1";
    const query = useTopGainersLosers(25, { chain, timeFrame: "24h" });
    const movers = [...(query.data?.data?.gainers ?? []), ...(query.data?.data?.losers ?? [])];
    const displayCurrency = "USD";

    // Duplicate items enough times to ensure it fills the screen and loops smoothly
    // We need at least 2 sets for the infinite loop effect (0% -> -50%)
    const items = [...movers, ...movers, ...movers, ...movers];

    return (
        <div className="relative flex w-full overflow-hidden border-b border-border/40 bg-background py-2">
            {/* Fading Gradients */}
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-background to-transparent" />

            {/* Scrolling Content */}
            <div className="animate-ticker-scroll flex min-w-max shrink-0 items-center gap-8 px-4 hover:[animation-play-state:paused]">
                {items.map((item, i) => (
                    <div key={`${item.id}-${i}`} className="flex items-center gap-2 text-xs font-medium">
                        <Avatar className="size-4">
                            <AvatarImage src={item.logoUrl ?? undefined} alt={item.name ?? item.symbol ?? "Token"} />
                            <AvatarFallback>{(item.symbol ?? "T")[0]}</AvatarFallback>
                        </Avatar>
                        <span className="uppercase text-muted-foreground">{item.symbol ?? "—"}</span>
                        <span className="text-foreground">
                            {formatCurrency(item.priceUsd ?? 0, { currency: displayCurrency })}
                        </span>
                        <span
                            className={cn(
                                (item.priceChange24hPercent ?? 0) >= 0
                                    ? "text-[#8eb94f]"
                                    : "text-red-500"
                            )}
                        >
                            {formatPercentage(item.priceChange24hPercent ?? 0, { sign: true })}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
