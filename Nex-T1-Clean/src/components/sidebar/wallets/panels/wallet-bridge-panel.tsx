"use client";

import { WalletSnapshot } from "@/modules/wallets/profile";
import { useState, useEffect, useMemo, useTransition } from "react";
import { ArrowDown, ArrowLeftRight, Coins } from "lucide-react";
import { ActionSlideButton } from "../action-slide-button";
import { getSupportedChains } from "@/lib/chains";
import { getLiFiQuoteAction } from "@/server/actions/bridge";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { useSendTransaction } from "wagmi";
import { parseUnits } from "viem";
import { Input } from "@/components/ui/input";
import { useCdpTransactions } from "@/lib/cdp/use-cdp-transactions";


import { logger } from '@/lib/logger';
export function WalletBridgePanel({ wallet }: { wallet: WalletSnapshot }) {
  const isCdpWallet = wallet.provider === "cdp" || wallet.metadata?.walletType === "cdp";
  // Chain Selection
  const supportedChains = useMemo(() => getSupportedChains(), []);
  // Use metadata chainId safely
  const initialChainId = wallet.metadata?.chainId ? wallet.metadata.chainId.toString() : "1";
  
  const [fromChainId, setFromChainId] = useState<string>(initialChainId);
  const [toChainId, setToChainId] = useState<string>(supportedChains.find(c => c.id.toString() !== fromChainId)?.id.toString() ?? "137"); 
  const [amount, setAmount] = useState("");
  const [debouncedAmount] = useDebounce(amount, 500);
  
  // Quote State
  const [quote, setQuote] = useState<UntypedJson>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { sendTransaction, isPending: isTxPending } = useSendTransaction();
  const cdpTx = useCdpTransactions();
  const [isCdpBridging, setIsCdpBridging] = useState(false);

  // Fetch Quote — must be in useEffect since it triggers state mutations and async fetches
  useEffect(() => {
    if (!debouncedAmount || Number(debouncedAmount) <= 0) {
        setQuote(null);
        return;
    }

    // Use the native token sentinel address for bridge quotes.
    const nativeToken = "0x0000000000000000000000000000000000000000";

    setError(null);
    startTransition(async () => {
         // Amount to Wei (assuming 18 decimals for native)
         const rawAmount = parseUnits(debouncedAmount, 18).toString();

        const res = await getLiFiQuoteAction({
            fromChain: fromChainId,
            toChain: toChainId,
            fromToken: nativeToken,
            toToken: nativeToken, // Bridging Native to Native
            fromAmount: rawAmount,
            fromAddress: wallet.address ?? "0x0000000000000000000000000000000000000000" // Fallback
        });

        if (res.success) {
            setQuote(res.data);
        } else {
            setError(res.error ?? "Failed to fetch bridge quote");
            setQuote(null);
        }
    });
  }, [debouncedAmount, fromChainId, toChainId, wallet.address]);

  const handleBridge = async () => {
      if (!quote?.transactionRequest) return;
      const tx = quote.transactionRequest;

      // Nex Wallets: route through sendEvmUserOperation (ERC-4337)
      if (isCdpWallet && cdpTx.enabled) {
        try {
          setIsCdpBridging(true);
          await cdpTx.sendEvmUserOperation({
            calls: [{
              to: tx.to as string,
              value: tx.value ? BigInt(tx.value) : undefined,
              data: tx.data as string | undefined,
            }],
          });
          toast.success("Bridge transaction initiated via Nex Wallet");
        } catch (err) {
          logger.error(err);
          toast.error(err instanceof Error ? err.message : "Nex Wallet bridge failed");
        } finally {
          setIsCdpBridging(false);
        }
        return;
      }

      // External wallets: route through wagmi
      try {
          sendTransaction({
              to: tx.to,
              data: tx.data,
              value: BigInt(tx.value ?? 0),
          });
          toast.success("Bridge transaction initiated");
      } catch (err) {
          logger.error(err);
          toast.error("Bridge failed to initiate");
      }
  };

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto pr-1 custom-scrollbar">
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-[#171717] dark:text-white">Bridge Assets</h3>

        <div className="space-y-4">
             {/* From Chain */}
             <div className="space-y-2">
                <label className="text-xs font-medium text-[#666666] dark:text-zinc-500">From Network</label>
                <div className="relative">
                    <select 
                        className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-black/10 bg-white/70 px-3 text-[#171717] outline-none focus:border-black/20 dark:border-white/5 dark:bg-white/5 dark:text-white dark:focus:border-white/20"
                        value={fromChainId}
                        onChange={(e) => setFromChainId(e.target.value)}
                    >
                         {supportedChains.map(chain => (
                             <option key={chain.id} value={chain.id}>{chain.name}</option>
                         ))}
                    </select>
                    <ArrowDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666666] dark:text-zinc-500" />
                </div>
             </div>
             
             {/* Creating a visual connection */}
             <div className="flex justify-center -my-2 relative z-10">
                 <div 
                    className="cursor-pointer rounded-full border border-black/10 bg-white/70 p-1.5 transition-colors hover:border-black/20 dark:border-white/10 dark:bg-transparent dark:hover:border-white/30"
                    onClick={() => {
                        const temp = fromChainId;
                        setFromChainId(toChainId);
                        setToChainId(temp);
                    }}
                >
                    <ArrowLeftRight className="h-4 w-4 rotate-90 text-[#171717] dark:text-white" />
                 </div>
             </div>

             {/* To Chain */}
             <div className="space-y-2">
                <label className="text-xs font-medium text-[#666666] dark:text-zinc-500">To Network</label>
                 <div className="relative">
                    <select 
                        className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-black/10 bg-white/70 px-3 text-[#171717] outline-none focus:border-black/20 dark:border-white/5 dark:bg-white/5 dark:text-white dark:focus:border-white/20"
                        value={toChainId}
                         onChange={(e) => setToChainId(e.target.value)}
                    >
                         {supportedChains.map(chain => (
                             <option key={chain.id} value={chain.id}>{chain.name}</option>
                         ))}
                    </select>
                    <ArrowDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666666] dark:text-zinc-500" />
                </div>
             </div>

             {/* Amount */}
             <div className="space-y-2">
                <label className="text-xs font-medium text-[#666666] dark:text-zinc-500">Amount</label>
                <div className="relative">
                    <Input 
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0.00"
                        type="number"
                        className="h-12 border-black/10 bg-white/70 pl-10 text-[#171717] placeholder:text-[#666666] dark:border-white/5 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-600"
                    />
                    <Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666666] dark:text-zinc-500" />
                </div>
            </div>

            {/* Quote Info */}
            {quote && !error && (
                <div className="animate-in slide-in-from-bottom-2 space-y-2 rounded-lg border border-black/10 bg-white/70 p-4 fade-in dark:border-white/10 dark:bg-white/5">
                    <div className="flex justify-between text-xs">
                        <span className="text-[#666666] dark:text-zinc-500">Estimated Time</span>
                        <span className="text-[#171717] dark:text-white">{Math.ceil((quote.estimate?.executionDuration ?? 60) / 60)} min</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-[#666666] dark:text-zinc-500">Gas Cost</span>
                        <span className="text-[#171717] dark:text-white">~${quote.estimate?.gasCosts?.[0]?.amountUSD ?? "0.00"}</span>
                    </div>
                     <div className="flex justify-between text-xs">
                        <span className="text-[#666666] dark:text-zinc-500">Bridge Provider</span>
                        <span className="capitalize text-[#171717] dark:text-white">{quote.toolDetails?.key ?? "Li.Fi"}</span>
                    </div>
                </div>
            )}
            
            {error && (
                 <div className="rounded-lg bg-red-500/10 p-3 text-xs text-red-300 border border-red-500/20">
                    {error.includes("400") ? "Route not found or insufficient liquidity." : error}
                </div>
            )}
        </div>
      </div>

      <div className="mt-auto pt-4">
        <ActionSlideButton
            label={isPending ? "Finding Routes..." : (isTxPending || isCdpBridging) ? "Bridging..." : "Bridge Assets"}
            onClick={handleBridge}
            disabled={!quote || isPending || isTxPending || isCdpBridging}
            loading={isPending || isTxPending || isCdpBridging}
        />
      </div>
    </div>
  );
}
