"use client";

import { useMemo } from "react";
import Image from "next/image";
import type { WalletSnapshot } from "@/modules/wallets/profile";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Layers, AlertCircle } from "lucide-react";
import { useWalletProtocols } from "@/hooks/wallets/use-wallet-protocols";
import { formatFiat } from "@/lib/formatters/wallet";
import { resolveWalletRequestChainId } from "@/lib/portfolio/wallet-metadata";

interface WalletProtocolsPanelProps {
  wallet: WalletSnapshot;
}

export function WalletProtocolsPanel({ wallet }: WalletProtocolsPanelProps) {
  const { chainId, type } = useMemo(() => {
     const resolvedChainId = resolveWalletRequestChainId(wallet);
     const isEvm = resolvedChainId !== "solana";
     return { 
         chainId: String(resolvedChainId ?? 1), 
         type: (isEvm ? "evm" : "solana") as "evm" | "solana"
     };
  }, [wallet]);

  const { protocols, totalUsd, isLoading, error, isSupported } = useWalletProtocols(
    wallet.address ?? undefined, 
    type, 
    chainId
  );

  if (!isSupported) {
      return (
          <div className="flex flex-col items-center justify-center py-10 opacity-60 gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-zinc-500" />
              <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-300">Not Supported</p>
                  <p className="text-xs text-zinc-500">Protocol tracking is not available for this network yet.</p>
              </div>
          </div>
      );
  }

  if (isLoading) {
      return (
          <div className="space-y-3 p-1">
              {[1,2,3].map(i => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl bg-black/[0.06] dark:bg-white/5" />
              ))}
          </div>
      );
  }

  if (error) {
     return <div className="text-xs text-red-400 text-center py-4">Failed to load protocols: {error}</div>;
  }

  if (protocols.length === 0) {
      return <div className="text-xs text-zinc-500 text-center py-8">No active protocol positions found</div>;
  }

  return (
    <div className="space-y-4">
       <div className="flex items-center justify-between px-2">
           <span className="text-xs text-[#666666] dark:text-zinc-500">Total DeFi Value</span>
           <span className="text-sm font-medium text-[#171717] dark:text-white">{formatFiat(totalUsd)}</span>
       </div>

       <div className="space-y-2">
          {protocols.map((protocol) => (
             <div 
                key={protocol.id}
                className="group flex items-center justify-between rounded-lg border border-black/10 bg-white/60 p-3 transition-colors hover:border-black/20 dark:border-transparent dark:bg-white/5 dark:hover:border-white/10"
            >
                <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-black/[0.06] dark:bg-black/20">
                       {protocol.logo ? (
                           <Image src={protocol.logo} alt={protocol.name} fill sizes="40px" className="object-cover" unoptimized />
                       ) : (
                           <Layers className="h-5 w-5 text-[#666666] dark:text-zinc-500" />
                       )}
                    </div>
                    <div>
                        <div className="text-sm font-medium text-[#171717] dark:text-zinc-200">{protocol.name}</div>
                        {protocol.url && (
                             <a href={protocol.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-[#666666] transition-colors hover:text-indigo-500 dark:text-zinc-500 dark:hover:text-indigo-400">
                                 View Protocol <ExternalLink className="h-2 w-2" />
                             </a>
                        )}
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-sm font-medium text-[#171717] dark:text-white">{formatFiat(protocol.valueUsd)}</div>
                </div>
            </div>
          ))}
       </div>
    </div>
  );
}
