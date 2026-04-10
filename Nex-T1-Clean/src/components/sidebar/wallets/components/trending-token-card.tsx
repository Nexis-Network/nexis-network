"use client";

import { memo } from "react";
import Image from "next/image";
import { formatFiat } from "@/lib/formatters/wallet";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendingToken {
  id: string;
  name: string;
  symbol: string;
  marketCapRank: number | null;
  thumbnailUrl: string | null;
  quickStats: {
    priceUsd: number | null;
    priceChangePercentage24h: number | null;
  };
}

export const TrendingTokenCard = memo(function TrendingTokenCard({ token }: { token: TrendingToken }) {
  const isPositive = (token.quickStats.priceChangePercentage24h ?? 0) >= 0;

  return (
    <div className="flex h-[140px] w-[140px] shrink-0 flex-col justify-between rounded-[16px] border border-black/10 bg-white/60 p-4 transition-colors group hover:border-black/20 dark:border-white/5 dark:bg-[#c4c4c4]/10 dark:hover:border-white/10">
      <div className="flex items-start justify-between">
        <div className="relative h-9 w-9 overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/5">
          {token.thumbnailUrl ? (
            <Image
              src={token.thumbnailUrl}
              alt={token.symbol}
              fill
              className="object-cover"
            />
          ) : (
             <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-zinc-500">
               {token.symbol.slice(0, 2)}
             </div>
          )}
        </div>
        <div className={cn("flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full", isPositive ? "text-green-400" : "text-red-400")}>
           {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
           {Math.abs(token.quickStats.priceChangePercentage24h ?? 0).toFixed(1)}%
        </div>
      </div>

      <div className="space-y-0.5">
        <p className="truncate text-[15px] font-semibold tracking-wide text-[#171717] dark:text-white" title={token.name}>{token.symbol}</p>
        <p className="text-xs font-medium text-[#666666] dark:text-zinc-400">{formatFiat(token.quickStats.priceUsd ?? 0)}</p>
      </div>
    </div>
  );
});
