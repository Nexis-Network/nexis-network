"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getSwapQuote, type SwapQuotePayload } from "@/lib/swap-aggregator";
import { CryptoSwapCard } from "@/components/market-overview/crypto-swap-card";
import { Loader2 } from "lucide-react";

interface SwapDialogProps {
    isOpen: boolean;
    onClose: () => void;
    initialFromToken?: string;
    initialToToken?: string;
}

export function SwapDialog({ isOpen, onClose, initialFromToken = "ETH", initialToToken = "USDC" }: SwapDialogProps) {
    const [fromToken, setFromToken] = useState(initialFromToken);
    const [toToken, setToToken] = useState(initialToToken);
    const [amount, setAmount] = useState("1");
    const [quote, setQuote] = useState<SwapQuotePayload | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFromToken(initialFromToken);
            setToToken(initialToToken);
            setQuote(null);
            setError(null);
        }
    }, [isOpen, initialFromToken, initialToToken]);

    const handleGetQuote = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getSwapQuote({
                fromToken,
                toToken,
                amount,
                fromChainId: 1, // Default to Ethereum for now
                toChainId: 1,
            });
            setQuote(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch quote");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Swap Tokens</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>From</Label>
                            <Input value={fromToken} onChange={(e) => setFromToken(e.target.value)} placeholder="Symbol (e.g. ETH)" />
                        </div>
                        <div className="space-y-2">
                            <Label>To</Label>
                            <Input value={toToken} onChange={(e) => setToToken(e.target.value)} placeholder="Symbol (e.g. USDC)" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </div>
                    <Button onClick={handleGetQuote} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Get Quote
                    </Button>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {quote && <CryptoSwapCard output={quote} />}
                </div>
            </DialogContent>
        </Dialog>
    );
}
