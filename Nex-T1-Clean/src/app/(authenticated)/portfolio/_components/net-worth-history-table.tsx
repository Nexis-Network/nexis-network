"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";

interface NetWorthSnapshot {
  id: string;
  total_net_worth_usd: number;
  timestamp: string;
}

interface NetWorthHistoryTableProps {
  snapshots: NetWorthSnapshot[];
  className?: string;
}

export function NetWorthHistoryTable({ snapshots, className }: NetWorthHistoryTableProps) {
  // Sort by newest first
  const sortedSnapshots = [...snapshots].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className={cn("flex flex-col w-full", className)}>
      <div className="flex flex-col mb-4">
        <h3 className="text-base font-medium text-foreground">Net Worth History</h3>
        <span className="text-xs text-muted-foreground">
          {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="w-full">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 border-b border-border/60 px-4 py-3 text-xs font-normal uppercase tracking-wide text-muted-foreground">
          <div className="col-span-4">Date</div>
          <div className="col-span-4 text-right">Net Worth</div>
          <div className="col-span-4 text-right">Change</div>
        </div>

        {/* Rows */}
        <div className="flex flex-col">
          {sortedSnapshots.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
              No history found.
            </div>
          ) : (
            sortedSnapshots.map((snapshot, idx) => {
              const prevSnapshot = sortedSnapshots[idx + 1];
              const currentVal = Number(snapshot.total_net_worth_usd);
              const prevVal = prevSnapshot ? Number(prevSnapshot.total_net_worth_usd) : currentVal; // Fallback to 0 change if no prev
              
              const diff = currentVal - prevVal;
              const percentChange = prevVal !== 0 ? (diff / prevVal) * 100 : 0;
              const isPositive = diff >= 0;

              return (
                <div 
                  key={snapshot.id} 
                className="group relative grid grid-cols-12 items-center gap-4 rounded-lg border-b border-transparent px-4 py-4 transition-colors hover:border-border/60 hover:bg-accent/30 cursor-pointer"
                >
                  {/* Date */}
                  <div className="col-span-4 flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {format(new Date(snapshot.timestamp), "MMM dd, yyyy HH:mm")}
                    </span>
                  </div>

                  {/* Net Worth */}
                  <div className="col-span-4 text-right">
                    <span className="text-sm text-foreground">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(currentVal)}
                    </span>
                  </div>

                  {/* Change */}
                  <div className="col-span-4 text-right">
                    <div className={cn(
                      "inline-flex items-center gap-1 text-sm font-medium",
                      prevSnapshot 
                        ? (isPositive ? "text-emerald-400" : "text-red-400")
                        : "text-muted-foreground"
                    )}>
                       {prevSnapshot ? (
                         <>
                           <span>{isPositive ? "+" : ""}{diff.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                           <span className="text-xs opacity-70">({percentChange.toFixed(2)}%)</span>
                         </>
                       ) : (
                         <span>-</span>
                       )}
                    </div>
                  </div>

                   {/* Hover Action */}
                  <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/60 text-foreground">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
