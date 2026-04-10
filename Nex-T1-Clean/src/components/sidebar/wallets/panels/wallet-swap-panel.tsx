"use client";

import { WalletSnapshot } from "@/modules/wallets/profile";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useTransition } from "react";
import { ArrowDown, Settings2, Loader2 } from "lucide-react";
import { ActionSlideButton } from "../action-slide-button";
import { getSwapQuoteAction } from "@/server/actions/swap";
import { Input } from "@/components/ui/input";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { formatFiat } from "@/lib/formatters/wallet";
import { useSendTransaction } from "wagmi";
import { parseUnits } from "viem";
import { useCdpSwapExecute } from "@/lib/hooks/cdp/use-cdp-swap";


import { logger } from '@/lib/logger';
export function WalletSwapPanel({ wallet }: { wallet: WalletSnapshot }) {
  const isCdpWallet = wallet.provider === "cdp" || wallet.metadata?.walletType === "cdp";

  const [sellToken, setSellToken] = useState("ETH");
  const [buyToken, setBuyToken] = useState("USDC");
  const [sellAmount, setSellAmount] = useState("");
  const [debouncedSellAmount] = useDebounce(sellAmount, 500);
  const [quote, setQuote] = useState<UntypedJson>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const priceImpactValue = quote?.estimatedPriceImpact ?? quote?.priceImpact ?? null;
  const priceImpactLabel =
    typeof priceImpactValue === "number"
      ? String(priceImpactValue)
      : typeof priceImpactValue === "string"
        ? priceImpactValue
        : "Unavailable";

  const { sendTransaction, isPending: isTxPending } = useSendTransaction();
  const { executeSwap: cdpSwap, isPending: isCdpSwapPending } = useCdpSwapExecute();

  useEffect(() => {
    if (!debouncedSellAmount || Number(debouncedSellAmount) <= 0) {
      setQuote(null);
      return;
    }

    const fetchQuote = async () => {
        setError(null);
        startTransition(async () => {
             // Static token map to avoid a token list dependency in this panel.
            const tokenMap: Record<string, string> = {
                "ETH": "ETH",
                "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f"
            };

            const sellTokenAddr = tokenMap[sellToken] || sellToken;
            const buyTokenAddr = tokenMap[buyToken] || buyToken;

            // Simple conversion for ETH decimals (18) vs USDC (6) if needed, 
            // but 0x API takes base units (wei) usually.
            // Assumption: User inputs '1.0' ETH. We need to convert to wei.
            // Converting roughly here:
            const sellAmountBase = parseUnits(debouncedSellAmount, 18).toString(); 

            const res = await getSwapQuoteAction({
                chainId: Number(wallet.metadata?.chainId ?? 1),
                sellToken: sellTokenAddr,
                buyToken: buyTokenAddr,
                sellAmount: sellAmountBase,
                takerAddress: wallet.address ?? undefined
            });

            if (res.success) {
                setQuote(res.data);
            } else {
                setError(res.error ?? "Failed to fetch quote");
                setQuote(null);
            }
        });
    };

    fetchQuote();
  }, [debouncedSellAmount, sellToken, buyToken, wallet.metadata, wallet.address]);

  const handleSwap = async () => {
      if (!wallet.address) return;

      // Nex Wallets: route through server-side CDP swap API
      if (isCdpWallet) {
        if (!sellAmount || Number(sellAmount) <= 0) return;
        try {
          const tokenMap: Record<string, string> = {
            "ETH": "ETH",
            "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
            "DAI": "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // DAI on Base
          };
          const result = await cdpSwap({
            walletAddress: wallet.address,
            fromToken: tokenMap[sellToken] || sellToken,
            toToken: tokenMap[buyToken] || buyToken,
            amount: parseUnits(sellAmount, 18).toString(),
            chainId: Number(wallet.metadata?.chainId ?? 8453),
          });
          toast.success(`Swap complete: ${result.txHash.slice(0, 10)}...`);
        } catch (err) {
          logger.error(err);
          toast.error(err instanceof Error ? err.message : "Nex Wallet swap failed");
        }
        return;
      }

      // External wallets: route through wagmi
      if (!quote) return;
      try {
          sendTransaction({
              to: quote.to,
              data: quote.data,
              value: BigInt(quote.value ?? 0),
          });
          toast.success("Swap transaction initiated");
      } catch (err) {
          logger.error(err);
          toast.error("Swap failed to initiate");
      }
  };

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto pr-1 custom-scrollbar">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
             <h3 className="text-lg font-medium text-[#171717] dark:text-white">Swap</h3>
             <Button variant="ghost" size="icon" className="h-8 w-8 text-[#666666] hover:text-[#171717] dark:text-zinc-500 dark:hover:text-white">
                <Settings2 className="h-4 w-4" />
             </Button>
        </div>

        <div className="space-y-2">
            {/* Sell Input */}
            <div className="space-y-3 rounded-xl border border-black/10 bg-white/70 p-4 transition-colors hover:border-black/20 dark:border-white/5 dark:bg-white/5 dark:hover:border-white/10">
                <div className="flex justify-between text-xs font-medium text-[#666666] dark:text-zinc-500">
                    <span>Sell</span>
                    <span>Balance: 0.00</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                    <Input 
                        className="h-auto w-full border-none bg-transparent p-0 text-2xl font-medium text-[#171717] placeholder:text-[#666666] focus-visible:ring-0 dark:text-white dark:placeholder:text-zinc-600" 
                        placeholder="0"
                        value={sellAmount}
                        onChange={e => setSellAmount(e.target.value)}
                        type="number"
                    />
                    <div className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-black/[0.06] px-3 py-1.5 text-sm font-medium text-[#171717] transition-colors hover:bg-black/[0.1] dark:bg-black/40 dark:text-white dark:hover:bg-black/60">
                        {/* Token selector */}
                         <select 
                            value={sellToken} 
                            onChange={e => setSellToken(e.target.value)}
                            className="bg-transparent outline-none appearance-none cursor-pointer"
                        >
                            <option value="ETH">ETH</option>
                            <option value="USDC">USDC</option>
                            <option value="DAI">DAI</option>
                        </select>
                        <ArrowDown className="h-3 w-3 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Switcher */}
             <div className="flex justify-center -my-3 relative z-10">
                <div 
                    className="cursor-pointer rounded-full border border-black/10 bg-white/70 p-1.5 transition-colors hover:border-black/20 dark:border-white/10 dark:bg-transparent dark:hover:border-white/30"
                    onClick={() => {
                        const temp = sellToken;
                        setSellToken(buyToken);
                        setBuyToken(temp);
                    }}
                >
                    <ArrowDown className="h-4 w-4 text-[#171717] dark:text-white" />
                </div>
            </div>

            {/* Buy Input */}
             <div className="space-y-3 rounded-xl border border-black/10 bg-white/70 p-4 transition-colors hover:border-black/20 dark:border-white/5 dark:bg-white/5 dark:hover:border-white/10">
                <div className="flex justify-between text-xs font-medium text-[#666666] dark:text-zinc-500">
                    <span>Buy</span>
                    {quote?.price && <span className="text-sky-400">1 {sellToken} = {Number(quote.price).toFixed(4)} {buyToken}</span>}
                </div>
                 <div className="flex justify-between items-center gap-4">
                     {isPending ? (
                             <div className="flex h-8 items-center text-sm text-[#666666] dark:text-zinc-500">
                             <Loader2 className="h-4 w-4 animate-spin mr-2" /> Fetching...
                         </div>
                     ) : (
                        <Input 
                            className="h-auto w-full border-none bg-transparent p-0 text-2xl font-medium text-[#171717] placeholder:text-[#666666] focus-visible:ring-0 dark:text-white dark:placeholder:text-zinc-600" 
                            placeholder="0"
                            value={quote ? formatFiat(quote.buyAmount / 10**6) : ""} // Rough decimal assumption, 0x returns raw units
                            readOnly
                        />
                     )}
                     
                    <div className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-black/[0.06] px-3 py-1.5 text-sm font-medium text-[#171717] transition-colors hover:bg-black/[0.1] dark:bg-black/40 dark:text-white dark:hover:bg-black/60">
                           <select 
                            value={buyToken} 
                            onChange={e => setBuyToken(e.target.value)}
                            className="bg-transparent outline-none appearance-none cursor-pointer"
                        >
                            <option value="USDC">USDC</option>
                            <option value="ETH">ETH</option>
                            <option value="DAI">DAI</option>
                        </select>
                         <ArrowDown className="h-3 w-3 opacity-50" />
                    </div>
                </div>
            </div>
        </div>

        {/* Quote Details */}
        {quote && !error && (
            <div className="space-y-2 rounded-lg border border-black/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="flex justify-between text-xs">
                    <span className="text-[#666666] dark:text-zinc-500">Gas Cost</span>
                    <span className="text-[#171717] dark:text-white">{quote.estimatedGas ? `~${quote.estimatedGas}` : "Unknown"}</span>
                </div>
                 <div className="flex justify-between text-xs">
                    <span className="text-[#666666] dark:text-zinc-500">Price Impact</span>
                    <span className="text-[#171717] dark:text-white">{priceImpactLabel}</span> 
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-[#666666] dark:text-zinc-500">Route</span>
                    <span className="max-w-[150px] truncate text-[#171717] dark:text-white">{quote.sources?.map((s: UntypedJson) => s.name).join(", ") || "0x API"}</span>
                </div>
            </div>
        )}

        {error && (
             <div className="rounded-lg bg-red-500/10 p-3 text-xs text-red-300 border border-red-500/20">
                {error}
            </div>
        )}
      </div>

      <div className="mt-auto pt-4">
        <ActionSlideButton
            label={isPending ? "Fetching Quote..." : (isTxPending || isCdpSwapPending) ? "Swap Pending..." : !sellAmount ? "Enter Amount" : "Swap"}
            onClick={handleSwap}
            disabled={isCdpWallet ? (!sellAmount || isPending || isCdpSwapPending) : (!quote || isPending || isTxPending)}
            loading={isPending || isTxPending || isCdpSwapPending}
        />
      </div>
    </div>
  );
}
