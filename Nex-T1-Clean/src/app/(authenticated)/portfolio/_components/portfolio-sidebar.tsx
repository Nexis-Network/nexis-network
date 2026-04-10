"use client";

import { ActionCard } from "./action-card";
import { RecentActivity } from "./recent-activity";
import { Watchlist } from "./watchlist";
import { AggregatedPortfolio } from "@/server/services/portfolio-service";

export interface PortfolioSidebarProps {
  portfolio?: AggregatedPortfolio;
  isLoading?: boolean;
}

export function PortfolioSidebar({ portfolio, isLoading = false }: PortfolioSidebarProps) {
  return (
    <div className="flex flex-col gap-6 w-full h-full">
      {/* Actions (Swap, Buy, Send, More) */}
      <ActionCard />

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="flex flex-col justify-center p-4 rounded-xl border border-border/60 bg-card/60">
           <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider mb-1">Swaps this week</span>
           <span className="text-xl font-bold text-foreground">0</span>
        </div>
        <div className="flex flex-col justify-center p-4 rounded-xl border border-border/60 bg-card/60">
           <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider mb-1">Profit & Loss</span>
           <div className="flex items-baseline gap-1">
             <span className="text-xl font-bold text-foreground">$0</span>
             <span className="text-sm font-medium text-muted-foreground">.00</span>
           </div>
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivity portfolio={portfolio} isLoading={isLoading} />

      {/* Watchlist */}
      <Watchlist />
    </div>
  );
}
