"use client";

import { useMemo } from "react";
import Image from "next/image";
import type { WalletSnapshot } from "@/modules/wallets/profile";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useWalletApprovals } from "@/hooks/wallets/use-wallet-approvals";
import { resolveWalletRuntimeContext } from "../components/wallet-runtime-context";

interface WalletApprovalsPanelProps {
  wallet: WalletSnapshot;
}

export function WalletApprovalsPanel({ wallet }: WalletApprovalsPanelProps) {
  const { chainId, type } = useMemo(
    () => resolveWalletRuntimeContext(wallet),
    [wallet],
  );

  const { approvals, isLoading, error, isSupported } = useWalletApprovals(wallet.address ?? undefined, type, String(chainId));

  if (!isSupported) {
      return (
          <div className="flex flex-col items-center justify-center py-10 opacity-60 gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-zinc-500" />
              <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-300">Not Supported</p>
                  <p className="text-xs text-zinc-500">Token approvals are not trackable for this network yet.</p>
              </div>
          </div>
      );
  }

  if (isLoading) {
      return (
          <div className="space-y-3 p-1">
              {[1,2,3,4].map(i => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl bg-black/[0.06] dark:bg-white/5" />
              ))}
          </div>
      );
  }

  if (error) {
     return <div className="text-xs text-red-400 text-center py-4">Failed to load approvals: {error}</div>;
  }

  if (approvals.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-10 text-center opacity-70 gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500/50" />
              <div className="space-y-1">
                   <p className="text-sm font-medium text-zinc-200">All Good</p>
                   <p className="text-xs text-zinc-500">No active token approvals found.</p>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-3">
       <div className="flex justify-between px-2 text-xs text-[#666666] dark:text-zinc-500">
           <span>Asset / Spender</span>
           <span>Risk</span>
       </div>
       <div className="space-y-2">
          {approvals.map((approval, i) => (
             <div 
                key={`${approval.tokenAddress}-${approval.spenderAddress}-${i}`}
                className="group flex items-center justify-between rounded-lg border border-black/10 bg-white/60 p-3 transition-colors hover:border-black/20 dark:border-transparent dark:bg-white/5 dark:hover:border-white/10"
            >
                <div className="flex items-center gap-3">
                    <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-black/[0.06] text-xs font-bold text-[#666666] dark:bg-black/20 dark:text-zinc-400">
                        {approval.tokenLogo ? (
                             <Image src={approval.tokenLogo} alt="" fill sizes="32px" className="object-cover" unoptimized />
                        ) : (
                             approval.tokenSymbol?.[0] || "?"
                        )}
                    </div>
                    <div>
                        <div className="text-xs font-medium text-[#171717] dark:text-zinc-200">{approval.tokenSymbol}</div>
                        <div className="flex items-center gap-1 text-[10px] text-[#666666] dark:text-zinc-500">
                            Approved to: <span className="text-[#171717] dark:text-zinc-400">{approval.spenderLabel || `${approval.spenderAddress.slice(0,6)}...`}</span>
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    {approval.isUnlimited ? (
                        <div className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                            <ShieldAlert className="h-3 w-3" /> Unlimited
                        </div>
                    ) : (
                        <div className="text-xs text-[#666666] dark:text-zinc-400">
                             {Number(approval.amount) > 0 ? "Limited" : "Revoked"}
                        </div>
                    )}
                </div>
            </div>
          ))}
       </div>
    </div>
  );
}
