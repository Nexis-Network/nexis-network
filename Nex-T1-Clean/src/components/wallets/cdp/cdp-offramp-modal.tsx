"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnimatedNumberInput } from "@/components/numbers/input-animation";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPPORTED_ASSETS = ["ETH", "USDC", "USDT", "DAI", "WETH"] as const;
type SupportedAsset = (typeof SUPPORTED_ASSETS)[number];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CdpOfframpModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
  chainId?: number;
};

type OfframpState = "idle" | "loading" | "ready" | "error";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CdpOfframpModal({
  open,
  onOpenChange,
  address,
  chainId,
}: CdpOfframpModalProps) {
  const [state, setState] = useState<OfframpState>("idle");
  const [offrampUrl, setOfframpUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<SupportedAsset>("ETH");
  const [amount, setAmount] = useState("");

  const fetchOfframpUrl = useCallback(async () => {
    setState("loading");
    setError(null);

    try {
      const params = new URLSearchParams();
      if (chainId !== undefined) {
        params.set("chainId", String(chainId));
      }
      params.set("asset", selectedAsset);
      if (amount && Number(amount) > 0) {
        params.set("amount", amount);
      }

      const response = await fetch(
        `/api/cdp/wallets/${address}/offramp?${params.toString()}`,
        { credentials: "include" },
      );

      const body = (await response.json()) as {
        success?: boolean;
        data?: { url?: string };
        error?: { message?: string };
      };

      if (!response.ok || !body.success || !body.data?.url) {
        throw new Error(
          body.error?.message ?? "Failed to generate offramp URL",
        );
      }

      setOfframpUrl(body.data.url);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Offramp unavailable");
      setState("error");
    }
  }, [address, chainId, selectedAsset, amount]);

  useEffect(() => {
    if (!open) {
      setState("idle");
      setOfframpUrl(null);
      setError(null);
      setAmount("");
      setSelectedAsset("ETH");
    }
  }, [open]);

  const handleContinue = useCallback(() => {
    if (offrampUrl) {
      window.open(offrampUrl, "_blank", "noopener,noreferrer");
      setOfframpUrl(null);
      void fetchOfframpUrl();
    } else {
      fetchOfframpUrl();
    }
  }, [offrampUrl, fetchOfframpUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cash Out
          </DialogTitle>
          <DialogDescription>
            Sell crypto for fiat via Coinbase Pay
          </DialogDescription>
        </DialogHeader>

        {/* Loading */}
        {state === "loading" && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <p className="text-sm text-muted-foreground">
              Preparing Coinbase Pay...
            </p>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-white">
                Offramp Unavailable
              </p>
              <p className="text-xs text-red-400">
                {error ?? "Could not load offramp service"}
              </p>
            </div>
            <DialogFooter className="w-full">
              <Button
                variant="outline"
                onClick={fetchOfframpUrl}
                className="flex-1 gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Idle + Ready: show form */}
        {(state === "idle" || state === "ready") && (
          <div className="space-y-4">
            {/* Asset selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Asset to sell
              </label>
              <div className="flex gap-2 flex-wrap">
                {SUPPORTED_ASSETS.map((asset) => (
                  <button
                    key={asset}
                    type="button"
                    onClick={() => {
                      setSelectedAsset(asset);
                      setOfframpUrl(null);
                      setState("idle");
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedAsset === asset
                        ? "border-blue-500 bg-blue-500/10 text-blue-400"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    {asset}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-2">
              <label
                htmlFor="offramp-amount"
                className="text-xs font-medium text-muted-foreground"
              >
                Amount (optional)
              </label>
              <AnimatedNumberInput
                id="offramp-amount"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setOfframpUrl(null);
                  setState("idle");
                }}
                className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xl font-semibold text-white tabular-nums placeholder:text-muted-foreground/40 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              />
            </div>

            {/* Wallet info */}
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Sell from</span>
                <span className="font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span>Asset</span>
                <span>{selectedAsset}</span>
              </div>
              {amount && Number(amount) > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <span>Amount</span>
                  <span className="tabular-nums">
                    {amount} {selectedAsset}
                  </span>
                </div>
              )}
            </div>

            {/* Action button */}
            <Button
              onClick={handleContinue}
              className="w-full gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {state === "ready" && offrampUrl
                ? "Open Coinbase Pay"
                : "Continue to Coinbase"}
            </Button>

            {/* Note */}
            <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
              Requires a linked Coinbase account. You will be redirected to
              Coinbase Pay in a new tab to complete the cash-out.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
