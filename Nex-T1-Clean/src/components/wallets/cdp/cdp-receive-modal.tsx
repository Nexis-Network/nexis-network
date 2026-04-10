"use client";

import { useState, useCallback } from "react";
import {
  Copy,
  Check,
  QrCode,
  ExternalLink,
  ArrowDownLeft,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CdpReceiveModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
  chain: "evm" | "solana";
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getChainConfig(chain: "evm" | "solana") {
  if (chain === "solana") {
    return {
      name: "Solana",
      symbol: "SOL",
      explorerUrl: (addr: string) => `https://solscan.io/account/${addr}`,
      badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    };
  }
  return {
    name: "Base (EVM)",
    symbol: "ETH",
    explorerUrl: (addr: string) => `https://basescan.org/address/${addr}`,
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CdpReceiveModal({
  open,
  onOpenChange,
  address,
  chain,
}: CdpReceiveModalProps) {
  const [copied, setCopied] = useState(false);
  const config = getChainConfig(chain);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [address]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownLeft className="h-5 w-5" />
            Receive
          </DialogTitle>
          <DialogDescription>
            Deposit tokens to your Nex Wallet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Chain Badge */}
          <div className="flex items-center justify-center">
            <Badge
              variant="outline"
              className={cn("text-xs px-3 py-1", config.badgeColor)}
            >
              {config.name}
            </Badge>
          </div>

          {/* QR Code Placeholder */}
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center justify-center w-48 h-48 rounded-xl border border-white/10 bg-white/[0.03]">
              <QrCode className="h-16 w-16 text-muted-foreground/50 mb-2" />
              <p className="text-[10px] text-muted-foreground">
                QR code coming soon
              </p>
            </div>
          </div>

          {/* Address Display */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Your {config.name} Address
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                <p className="text-xs font-mono text-white break-all leading-relaxed">
                  {address}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="flex-shrink-0"
                aria-label="Copy address"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <a
              href={config.explorerUrl(address)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button variant="outline" className="w-full gap-2">
                <ExternalLink className="h-4 w-4" />
                View on Explorer
              </Button>
            </a>
          </div>

          {/* Warning */}
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
            <p className="text-xs text-yellow-400/90 leading-relaxed">
              Only send {config.symbol} and tokens on the{" "}
              <span className="font-medium">{config.name}</span> network to this
              address. Sending tokens on other networks may result in permanent
              loss.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
