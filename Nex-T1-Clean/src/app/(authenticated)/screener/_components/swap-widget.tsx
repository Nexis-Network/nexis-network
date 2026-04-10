"use client";

import { useState, useEffect } from "react";
import { ArrowDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import useSWRMutation from "swr/mutation";
import { CoinMarketRow } from "@/types/market";
import { useNexAccount } from "@/modules/wallets/nex/hooks/use-nex-account";
import { useAuthContext } from "@/lib/hooks/auth/use-auth-context";
import { createNexSmartAccountClient } from "@/modules/wallets/nex/client-factory";
import { encodeFunctionData, erc20Abi, parseUnits } from "viem";
import { toast } from "sonner";

import { logger } from '@/lib/logger';
interface SwapWidgetProps {
    isOpen: boolean;
    onClose: () => void;
    initialInputToken?: CoinMarketRow | null;
}

const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"; // 0x convention

async function fetchQuote(url: string, { arg }: { arg: UntypedJson }) {
    const params = new URLSearchParams(arg);
    const res = await fetch(`${url}?${params}`);
    if (!res.ok) throw new Error("Failed to fetch quote");
    return res.json();
}

export function SwapWidget({ isOpen, onClose, initialInputToken }: SwapWidgetProps) {
    const [inputAmount, setInputAmount] = useState("");
    const [sellToken] = useState<UntypedJson>(initialInputToken || null); 
    const [buyToken, setBuyToken] = useState<UntypedJson>(null); 
    const [isExecuting, setIsExecuting] = useState(false);

    // Auth + Smart Wallet
    const { user } = useAuthContext();
    const userId = user?.id ?? null;
    const { evm } = useNexAccount(userId);
    const walletReady = !!userId && !!evm.account && !!evm.smartAccountAddress;

    // Trigger quote
    const { trigger: getQuote, data: quote, isMutating: isQuoteLoading, reset } = useSWRMutation(
        "/api/swap/quote",
        fetchQuote
    );

    // Debounce Quote
    useEffect(() => {
        const timer = setTimeout(() => {
            if (walletReady && sellToken && buyToken && inputAmount && parseFloat(inputAmount) > 0) {
                 // Determine Decimals - Default 18 if unknown
                 const decimals = sellToken.decimals || 18;
                 try {
                     const sellAmountBase = parseUnits(inputAmount, decimals).toString();
                     getQuote({
                        sellToken: sellToken.id || sellToken.address || sellToken.token_address,
                        buyToken: buyToken.id || buyToken.address || buyToken.token_address,
                        sellAmount: sellAmountBase,
                        chainId: String(evm.chainId ?? 1),
                        takerAddress: evm.smartAccountAddress || undefined
                    });
                 } catch (e) {
                     logger.error("Invalid amount", e);
                 }
            } else {
                reset();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [inputAmount, sellToken, buyToken, getQuote, evm.chainId, evm.smartAccountAddress, walletReady, reset]);

    const handleSwap = async () => {
        if (!quote || !evm.account || !evm.smartAccountAddress) {
            toast.error("Wallet not ready");
            return;
        }

        setIsExecuting(true);
        try {
            const client = createNexSmartAccountClient({
                account: evm.account,
                chainId: evm.chainId
            });

            const txs = [];

            // 1. Approve if needed (Batching!)
            // Quote usually returns 'allowanceTarget'
            // Check if sellToken is NOT Native (Native doesn't need approval)
            // 0x uses 0xeee... for native.
            const isNative = sellToken.id === NATIVE_TOKEN || sellToken.symbol === "ETH" || sellToken.symbol === "MATIC"; // Add robust check
            
            if (!isNative && quote.allowanceTarget) {
                // We should ideally check allowance first to save gas, but 'approve 0' then 'approve amount' or just 'approve amount' is safe.
                // Or just blindly approve the amount to be sold.
                const approveData = encodeFunctionData({
                    abi: erc20Abi,
                    functionName: "approve",
                    args: [quote.allowanceTarget, BigInt(quote.sellAmount)]
                });

                txs.push({
                    to: sellToken.id as `0x${string}`,
                    data: approveData,
                    value: 0n
                });
            }

            // 2. The Swap Transaction
            txs.push({
                to: quote.to as `0x${string}`,
                data: quote.data as `0x${string}`,
                value: BigInt(quote.value)
            });

            // Execute Batch
            const hash = await client.sendTransaction({
                calls: txs
            });

            toast.success("Swap Submitted", {
                description: `Transaction Hash: ${hash}`
            });
            onClose();

        } catch (error: UntypedJson) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error("Swap Validation Failed", message);
            toast.error("Swap Failed", {
               description: message || "Unknown error"
            });
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="bg-card border border-border text-foreground rounded-2xl w-full max-w-[400px] p-0 overflow-hidden">
                <div className="flex flex-col">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <h2 className="text-lg font-semibold">Swap</h2>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Sell Token */}
                        <div className="bg-muted rounded-xl p-4 space-y-2 border border-border">
                             <div className="flex justify-between text-xs text-muted-foreground">
                                <span>You pay</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <Input 
                                        value={inputAmount}
                                        onChange={(e) => setInputAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="bg-transparent border-0 p-0 text-2xl font-bold text-foreground placeholder:text-muted-foreground focus-visible:ring-0 shadow-none"
                                        type="number"
                                    />
                                    <div className="text-xs text-muted-foreground mt-1">
                                         {sellToken?.symbol}
                                    </div>
                                </div>
                                <Button variant="outline" className="rounded-full">
                                    {sellToken ? sellToken.symbol : "Select"}
                                </Button>
                            </div>
                        </div>

                        <div className="flex justify-center -my-3 relative z-10">
                            <div className="bg-card p-1.5 rounded-full border border-border">
                                <ArrowDown className="w-4 h-4 text-foreground" />
                            </div>
                        </div>

                        {/* Buy Token */}
                        <div className="bg-muted rounded-xl p-4 space-y-2 border border-border">
                             <div className="flex justify-between text-xs text-muted-foreground">
                                <span>You receive</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                     <div className="text-2xl font-bold text-foreground">
                                        {quote ? (parseFloat(quote.buyAmount) / Math.pow(10, (buyToken?.decimals || 18))).toFixed(4) : "0.00"}
                                     </div>
                                </div>
                                {/* Mock Selector */}
                                <Button 
                                    variant="outline" 
                                    onClick={() => setBuyToken({ symbol: "USDC", id: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6 })}
                                    className="rounded-full"
                                >
                                    {buyToken ? buyToken.symbol : "Select Token"}
                                </Button>
                            </div>
                        </div>

                        {/* Footer */}
                        <Button 
                            variant="default"
                            className="w-full font-semibold py-6 text-base rounded-xl"
                            disabled={!walletReady || !quote || isQuoteLoading || isExecuting}
                            onClick={handleSwap}
                        >
                            {!walletReady ? (
                                "Connect Wallet"
                            ) : isExecuting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    Swapping...
                                </>
                            ) : isQuoteLoading ? (
                                "Fetching Quote..."
                            ) : (
                                "Review Swap"
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
