"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, ExternalLink, RefreshCcw } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useWalletActivity } from "@/hooks/wallets/use-wallet-activity";
import type { WalletSnapshot } from "@/modules/wallets/profile";

import { resolveWalletRuntimeContext } from "../components/wallet-runtime-context";

interface WalletTransactionHistoryProps {
  wallet: WalletSnapshot;
}

export function WalletTransactionHistory({ wallet }: WalletTransactionHistoryProps) {
  const { chainId, type, source } = useMemo(
    () => resolveWalletRuntimeContext(wallet),
    [wallet],
  );

  const { transactions, isLoading, error } = useWalletActivity(
    wallet.address ?? undefined,
    type,
    chainId,
    { source },
  );

  const sortedTx = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const timeA =
        typeof a.timestamp === "number"
          ? a.timestamp
          : new Date(a.timestamp).getTime();
      const timeB =
        typeof b.timestamp === "number"
          ? b.timestamp
          : new Date(b.timestamp).getTime();

      return (Number.isFinite(timeB) ? timeB : 0) - (Number.isFinite(timeA) ? timeA : 0);
    });
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full bg-black/[0.06] dark:bg-white/5" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-20 bg-black/[0.06] dark:bg-white/5" />
                <Skeleton className="h-2 w-12 bg-black/[0.04] opacity-50 dark:bg-white/5" />
              </div>
            </div>
            <Skeleton className="h-3 w-16 bg-black/[0.06] dark:bg-white/5" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center text-xs text-red-400">
        Failed to load activity: {error}
      </div>
    );
  }

  if (sortedTx.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-zinc-500">
        No transaction history found
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sortedTx.map((tx) => (
        <div
          key={tx.hash}
          className="group flex items-center justify-between rounded-lg border border-transparent p-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/5"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className={`
                flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 dark:border-white/5
                ${tx.direction === "in" ? "bg-green-500/10 text-green-500" :
    tx.direction === "out" ? "bg-red-500/10 text-red-500" :
      "bg-indigo-500/10 text-indigo-500"}
              `}
            >
              {tx.direction === "in" ? (
                <ArrowDownLeft className="h-4 w-4" />
              ) : tx.direction === "out" ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <RefreshCcw className="h-3 w-3" />
              )}
            </div>

            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-2">
                <span className="truncate text-xs font-medium text-[#171717] dark:text-zinc-200">
                  {tx.direction === "in"
                    ? "Receive"
                    : tx.direction === "out"
                      ? "Send"
                      : "Transaction"}
                </span>
                {tx.status === "failed" && (
                  <span className="rounded bg-red-500/20 px-1 text-[9px] text-red-400">
                    Failed
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#666666] dark:text-zinc-500">
                {format(new Date(tx.timestamp), "MMM d, HH:mm")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs text-[#171717] dark:text-zinc-300">
                {tx.value !== "0" ? (
                  <>
                    {tx.direction === "out" ? "-" : "+"}
                    {Number(tx.value) / 1e18 < 0.0001
                      ? "<0.0001"
                      : (Number(tx.value) / 1e18).toFixed(4)}{" "}
                    ETH
                  </>
                ) : (
                  "Interact"
                )}
              </span>
            </div>

            <a
              href={
                tx.explorerUrl ||
                (type === "evm"
                  ? `https://etherscan.io/tx/${tx.hash}`
                  : `https://solscan.io/tx/${tx.hash}`)
              }
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md p-1.5 text-[#666666] opacity-0 transition-all group-hover:bg-black/5 group-hover:text-[#171717] group-hover:opacity-100 dark:group-hover:bg-white/10 dark:group-hover:text-white"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
