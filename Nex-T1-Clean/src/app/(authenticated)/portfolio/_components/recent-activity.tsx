"use client";

import { ArrowRight, ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { AggregatedPortfolio } from "@/server/services/portfolio-service";

export interface RecentActivityProps {
  portfolio?: AggregatedPortfolio;
  isLoading?: boolean;
}

export function RecentActivity({ portfolio, isLoading = false }: RecentActivityProps) {
  const transactions = portfolio?.transactions?.slice(0, 5) || [];

  // Removing early return to prevent hook order deviation
  // if (isLoading && !portfolio) { ... }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
         <div className="flex flex-col">
            <h3 className="text-sm font-medium text-foreground">Recent activity</h3>
            <span className="text-xs text-muted-foreground">{portfolio?.transactions?.length || 0} transactions</span>
         </div>
      </div>

      {isLoading && !portfolio ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
        {transactions.map((tx) => {
          const isSwap = tx.category === "swap";
          const isReceive = tx.direction === "in";

          return (
            <div 
              key={tx.id} 
              className="group -mx-2 flex cursor-pointer items-center justify-between rounded-lg border border-transparent p-2 transition-colors hover:border-border/60 hover:bg-accent/30"
              onClick={() => {
                const url = tx.chain.kind === "solana" 
                  ? `https://solscan.io/tx/${tx.hash}` 
                  : `https://etherscan.io/tx/${tx.hash}`;
                window.open(url, "_blank");
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-transparent p-0">
                  {isSwap ? (
                    <RefreshCw className="w-4 h-4 text-blue-400" />
                  ) : isReceive ? (
                    <ArrowDownLeft className="w-4 h-4 text-green-400" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-orange-400" />
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground capitalize">
                    {tx.category === "transfer" ? (isReceive ? "Received" : "Sent") : tx.category}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {tx.summary || "Transaction"}
                  </span>
                </div>
              </div>
              
              <span className="text-xs text-muted-foreground font-medium">
                {tx.timestamp ? format(new Date(tx.timestamp), "MMM dd") : "-"}
              </span>
            </div>
          );
        })}

        {transactions.length === 0 && (
          <div className="py-4 text-center text-xs text-muted-foreground">
            No recent activity found.
          </div>
        )}
        </div>
      )}

      <button 
        className="mt-2 flex w-fit items-center justify-center gap-2 rounded-full border border-border/60 bg-transparent px-4 py-2 text-xs font-medium text-foreground transition-all hover:bg-accent/40 self-start"
        onClick={() => {
          // You could implement logic to switch tabs here if needed
          window.dispatchEvent(new CustomEvent("portfolio-tab-change", { detail: "activity" }));
        }}
      >
        View all activity
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
