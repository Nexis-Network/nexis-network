"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ExternalLink, ArrowUpRight, ArrowDownLeft, RefreshCw, ArrowRight } from "lucide-react";
import { TokenBalance } from "@/components/common/token-balance";
import { Badge } from "@/components/ui/badge";

export interface TransactionItem {
  id: string;
  tx_hash: string;
  chain: string;
  type: string; // 'send', 'receive', 'swap', 'approve', etc.
  status: string; // 'success', 'pending', 'failed'
  token_address?: string;
  amount?: number;
  symbol?: string; // Derived or joined
  block_time?: string;
}

interface TransactionHistoryTableProps {
  transactions: TransactionItem[];
  className?: string;
}

export function TransactionHistoryTable({ transactions, className }: TransactionHistoryTableProps) {
  const getExplorerUrl = (chain: string, hash: string) => {
    if (chain === "solana") return `https://solscan.io/tx/${hash}`;
    if (chain === "ethereum") return `https://etherscan.io/tx/${hash}`;
    return "#";
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "send": return <ArrowUpRight className="h-4 w-4 text-orange-400" />;
      case "receive": return <ArrowDownLeft className="h-4 w-4 text-green-400" />;
      case "swap": return <RefreshCw className="h-4 w-4 text-blue-400" />;
      default: return <ArrowRight className="h-4 w-4 text-zinc-400" />;
    }
  };

  return (
    <div className={cn("flex flex-col w-full", className)}>
      <div className="flex flex-col mb-4">
        {/* Header - could be optional if passed or handled by parent, but consistent with TokensTable */}
        {/* <h3 className="text-base font-medium text-white">Transactions</h3> 
            <span className="text-xs text-[#A1A1A1]">{transactions.length} transactions</span> */}
            {/* Keeping it simple as parent likely handles title "Transaction History" */}
      </div>

      <div className="w-full">
        {/* HeaderRow */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-white/5 text-xs text-[#525252] font-normal uppercase tracking-wide">
          <div className="col-span-3">Type</div>
          <div className="col-span-3">Asset / Amount</div>
          <div className="col-span-2 hidden md:block">Date</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Hash</div>
        </div>

        {/* Rows */}
        <div className="flex flex-col">
          {transactions.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-white/50 text-sm">
              No transactions found
            </div>
          ) : (
            transactions.map((tx) => (
              <div 
                key={tx.id} 
                className="group grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-transparent transition-colors border-b border-transparent hover:border-white/5 cursor-pointer rounded-lg relative"
              >
                {/* Type */}
                <div className="col-span-3">
                   <div className="flex items-center gap-2 capitalize text-zinc-200 font-medium">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 shrink-0">
                         {getTypeIcon(tx.type)}
                    </div>
                    {tx.type}
                  </div>
                </div>

                {/* Amount */}
                <div className="col-span-3">
                    {tx.amount && tx.amount > 0 ? (
                        <TokenBalance 
                            amount={tx.amount} 
                            symbol={tx.symbol} 
                            className="text-zinc-200 text-sm font-medium"
                        />
                    ) : (
                        <span className="text-zinc-500 text-sm">-</span>
                    )}
                </div>

                {/* Date */}
                <div className="col-span-2 hidden md:block text-zinc-400 text-sm">
                  {tx.block_time ? format(new Date(tx.block_time), "MMM dd, HH:mm") : "-"}
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <StatusBadge status={tx.status} />
                </div>

                {/* Hash */}
                <div className="col-span-2 text-right">
                   <a
                    href={getExplorerUrl(tx.chain, tx.tx_hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 z-10 relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {tx.tx_hash.slice(0, 4)}...{tx.tx_hash.slice(-4)}
                    <ExternalLink className="h-3 w-3" />
                  </a>

                   {/* Hover Action (Visual Only) */}
                   <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {/* Placeholder or nothing, since Hash is real link */}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
    const normalized = status.toLowerCase();
    if (normalized === 'success') return <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10">Success</Badge>;
    if (normalized === 'failed') return <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10">Failed</Badge>;
    return <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 bg-yellow-500/10">Pending</Badge>;
}
