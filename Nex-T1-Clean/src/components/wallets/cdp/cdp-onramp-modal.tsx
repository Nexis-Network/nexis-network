"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
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
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CdpOnrampModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
  chainId?: number;
};

type OnrampState = "loading" | "ready" | "error";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CdpOnrampModal({
  open,
  onOpenChange,
  address,
  chainId,
}: CdpOnrampModalProps) {
  const [state, setState] = useState<OnrampState>("loading");
  const [onrampUrl, setOnrampUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOnrampUrl = useCallback(async () => {
    setState("loading");
    setError(null);

    try {
      const params = new URLSearchParams();
      if (chainId !== undefined) {
        params.set("chainId", String(chainId));
      }

      const response = await fetch(
        `/api/cdp/wallets/${address}/onramp?${params.toString()}`,
        {
          credentials: "include",
        },
      );

      const body = (await response.json()) as {
        success?: boolean;
        data?: { url?: string };
        error?: { message?: string };
      };

      if (!response.ok || !body.success || !body.data?.url) {
        throw new Error(
          body.error?.message ?? "Failed to generate on-ramp URL",
        );
      }

      setOnrampUrl(body.data.url);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "On-ramp unavailable");
      setState("error");
    }
  }, [address, chainId]);

  useEffect(() => {
    if (open) {
      fetchOnrampUrl();
    } else {
      setState("loading");
      setOnrampUrl(null);
      setError(null);
    }
  }, [open, fetchOnrampUrl]);

  const handleOpenOnramp = useCallback(() => {
    if (onrampUrl) {
      window.open(onrampUrl, "_blank", "noopener,noreferrer");
      setOnrampUrl(null);
      void fetchOnrampUrl();
    }
  }, [fetchOnrampUrl, onrampUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Fund Wallet
          </DialogTitle>
          <DialogDescription>
            Buy crypto with a card via Coinbase Pay
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

        {/* Ready */}
        {state === "ready" && onrampUrl && (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                  <Image
                    src="/assets/wallet-logos/Coinbase.svg"
                    alt="Coinbase"
                    className="h-6 w-6"
                    width={24}
                    height={24}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Coinbase Pay</p>
                  <p className="text-xs text-muted-foreground">
                    Buy crypto with debit card, bank transfer, or Apple Pay
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Deposit to</span>
                <span className="font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span>Network</span>
                <span>Base</span>
              </div>
            </div>

            <Button onClick={handleOpenOnramp} className="w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              Open Coinbase Pay
            </Button>

            <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
              You will be redirected to Coinbase Pay in a new tab. Your
              purchased crypto will be sent directly to your Nex Wallet.
            </p>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-white">
                On-ramp Unavailable
              </p>
              <p className="text-xs text-red-400">
                {error ?? "Could not load on-ramp service"}
              </p>
            </div>
            <DialogFooter className="w-full">
              <Button
                variant="outline"
                onClick={fetchOnrampUrl}
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
      </DialogContent>
    </Dialog>
  );
}
