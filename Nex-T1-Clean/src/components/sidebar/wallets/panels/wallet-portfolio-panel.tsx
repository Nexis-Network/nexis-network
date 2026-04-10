"use client";

import { useMemo, useState, useEffect } from "react";
import { WalletSnapshot } from "@/modules/wallets/profile";
import { ArrowUpRight, Plus } from "lucide-react";
import { formatFiat } from "@/lib/formatters/wallet";
import { cn } from "@/lib/utils";
import { getTrendingTokens } from "@/server/actions/market-data";
import { TrendingTokenCard } from "../components/trending-token-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUserName } from "@/lib/hooks/user/use-current-user-name";
import { getEnhancedWalletData } from "@/server/actions/wallet-enhanced";
import { WalletViewType } from "../wallet-right-panel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";


import { logger } from '@/lib/logger';
// Helper to calculate previous value based on 24h change
function calculatePreviousValue(wallet: WalletSnapshot) {
  if (!wallet.tokens || wallet.tokens.length === 0) return 0;
  
  let previousTotal = 0;
  
  // Sum up (Current / (1 + change/100)) for each token
  for (const token of wallet.tokens) {
    const value = token.valueUsd ?? token.balance * (token.priceUsd ?? 0);
    const change = token.change24hPercent ?? 0;
    const previous = value / (1 + change / 100);
    previousTotal += previous;
  }

  // Also add any raw totals if tokens aren't granular (fallback)
  const tokensSum = wallet.tokens.reduce((acc, t) => acc + (t.valueUsd ?? 0), 0);
  const totalEst = wallet.totals.estimatedValueUsd ?? 0;
  
  if (totalEst > tokensSum) {
    previousTotal += (totalEst - tokensSum);
  }

  return previousTotal;
}

export function WalletPortfolioPanel({ wallet, showHistory: _showHistory, className, onViewChange }: { wallet: WalletSnapshot, showHistory?: boolean, className?: string, onViewChange?: (view: WalletViewType) => void }) {
  const username = useCurrentUserName();
  const currentNetworth = wallet.totals.estimatedValueUsd ?? 0;
  const previousNetworth = useMemo(() => calculatePreviousValue(wallet), [wallet]);
  
  const pnlValue = currentNetworth - previousNetworth;


  // Enhanced Data State (PnL & Watchlist)
  const [enhancedData, setEnhancedData] = useState<{ watchlistCount: number; pnl: { totalPnlUsd: number; totalPnlPercent: number } } | null>(null);

  // Trending Tokens State
  const [trendingTokens, setTrendingTokens] = useState<UntypedJson[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadTrending() {
      try {
        const tokens = await getTrendingTokens();
        if (isMounted) {
          setTrendingTokens(tokens);
        }
      } catch (err) {
        logger.error("Failed to load trending tokens", err);
      } finally {
        if (isMounted) setIsLoadingTrending(false);
      }
    }
    loadTrending();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
        if (!wallet.address) return;
        
        // Determine chainId
        let chainId = 1;
        if (wallet.type === 'external_solana' || wallet.metadata?.kind === 'solana' || wallet.provider?.includes('phantom') || wallet.metadata?.chainId === 101) {
            chainId = 101;
        } else if (wallet.metadata?.chainId) {
            chainId = Number(wallet.metadata.chainId);
        }

        try {
            const data = await getEnhancedWalletData(wallet.address!, chainId);
            if (isMounted && data) {
                setEnhancedData(data);
            }
        } catch (err) {
            logger.error("Failed to load enhanced wallet data", err);
        }
    }
    loadData();
    return () => { isMounted = false; };
  }, [wallet.address, wallet.id, wallet.type, wallet.metadata, wallet.provider]);

  // Use enhanced PnL if available, otherwise fallback to calculated local PnL (or 0)
  const displayPnlValue = enhancedData ? enhancedData.pnl.totalPnlUsd : pnlValue;
  const displayIsPositive = displayPnlValue >= 0;

  return (
    <div className={cn("flex h-full flex-col overflow-y-auto pr-1 no-scrollbar", className)}>
      
      {/* Section 1: Welcome Header */}
      <div className="mb-6 mt-2">
        <h1 className="text-[32px] font-medium leading-[1.1] text-[#171717] dark:text-white">
          Welcome to <br />
          Nex-T1, {username.split(' ')[0]}!
        </h1>
      </div>

      <div className="space-y-4 pb-4">
         {/* Section 2: Two Top Cards (PnL & Watchlist) */}
         <div className="grid grid-cols-2 gap-3">
          
          {/* Left Card: Wallet PnL */}
          <div className="relative flex aspect-square flex-col justify-between rounded-[16px] border border-black/10 bg-white/60 p-5 group dark:border-white/5 dark:bg-[#c4c4c4]/10">
             <div className="w-full flex justify-end">
                <Plus className="h-5 w-5 text-[#171717] dark:text-white/80" strokeWidth={2.5} />
             </div>
             
             <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold tracking-widest text-[#666666] dark:text-[#c4c4c4]/80">
                    Wallet PnL
                </p>
                <p className={cn("text-[14px] font-medium text-[#171717] dark:text-white", displayIsPositive ? "" : "")}>
                  {formatFiat(displayPnlValue)}
                </p>
             </div>
          </div>

          {/* Right Card: Watchlist */}
          <div 
             onClick={() => onViewChange?.("watchlist")}
             className="relative flex aspect-square cursor-pointer flex-col justify-between rounded-[16px] border border-black/10 bg-white/60 p-5 transition-colors group hover:bg-white dark:border-white/5 dark:bg-[#c4c4c4]/10 dark:hover:bg-[#c4c4c4]/20"
          >
              <div className="w-full flex justify-end">
                <ArrowUpRight className="h-5 w-5 text-[#171717] dark:text-white/80" strokeWidth={2.5} />
             </div>
             <div>
                <p className="mb-1 text-[10px] font-bold tracking-widest text-[#666666] dark:text-[#c4c4c4]/80">
                    {enhancedData ? enhancedData.watchlistCount : 0} Favorites
                </p>
                <p className="text-[14px] font-semibold tracking-wide text-[#171717] dark:text-white">
                  WATCHLIST
                </p>
             </div>
          </div>
        </div>

        {/* Section 3: Trending Tokens */}
        <div className="pt-2">
           <div className="flex items-center justify-between mb-4 pl-1">
              <h3 className="text-[20px] font-normal text-[#171717] dark:text-white">Trending</h3>
           </div>

           <Carousel
             opts={{
               align: "start",
               dragFree: true,
               containScroll: "trimSnaps",
             }}
             className="-mx-1"
           >
             <CarouselContent className="-ml-2 px-1">
               {isLoadingTrending ? (
                 Array.from({ length: 4 }).map((_, i) => (
                   <CarouselItem key={i} className="basis-auto pl-2">
                     <Skeleton className="h-[140px] w-[140px] rounded-[16px] bg-[#c4c4c4]/10" />
                   </CarouselItem>
                 ))
               ) : (
                 trendingTokens.map((token) => (
                   <CarouselItem key={token.id} className="basis-auto pl-2">
                     <TrendingTokenCard token={token} />
                   </CarouselItem>
                 ))
               )}
             </CarouselContent>
           </Carousel>
        </div>
      </div>
    </div>
  );
}
