"use client";

import Image from "next/image";
import { useState, useCallback } from "react";
import { Copy, Check, ExternalLink, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDefaultCdpEvmCapability } from "@/lib/networks/capabilities";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";

type CdpWalletCardProps = {
  chain: "evm" | "solana";
  address: string | null;
  label?: string;
  onExport?: () => void;
  className?: string;
};

function getChainDisplay(chain: "evm" | "solana") {
  if (chain === "solana") {
    return {
      name: "Solana",
      icon: LIQUID_GLASS_LOGOS.solana,
      explorerUrl: (addr: string) => `https://solscan.io/account/${addr}`,
    };
  }
  const defaultEvmCapability = getDefaultCdpEvmCapability();
  return {
    name: defaultEvmCapability.shortLabel,
    icon: defaultEvmCapability.icon,
    explorerUrl: (addr: string) =>
      `${defaultEvmCapability.explorerUrl?.replace(/\/+$/, "") ?? "https://basescan.org"}/address/${addr}`,
  };
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function CdpWalletCard({
  chain,
  address,
  label,
  onExport,
  className,
}: CdpWalletCardProps) {
  const [copied, setCopied] = useState(false);
  const chainInfo = getChainDisplay(chain);

  const handleCopy = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [address]);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/50 p-3",
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Chain icon */}
        <div className="relative flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={chainInfo.icon}
            alt={chainInfo.name}
            className="h-8 w-8 rounded-full"
          />
          {/* CDP badge */}
          <Image
            src="/assets/wallet-logos/Coinbase.svg"
            alt="Nex Wallet"
            className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border border-background"
            width={14}
            height={14}
          />
        </div>

        {/* Wallet info */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {label ?? (chain === "solana" ? "Nex Wallet (SOL)" : "Nex Wallet (EVM)")}
          </p>
          {address ? (
            <p className="text-xs text-muted-foreground font-mono">
              {truncateAddress(address)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Provisioning...</p>
          )}
        </div>
      </div>

      {/* Actions */}
      {address && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            title="Copy address"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>

          <a
            href={chainInfo.explorerUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            title="View on explorer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          {onExport && chain !== "evm" && (
            <button
              type="button"
              onClick={onExport}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              title="Export private key"
            >
              <Key className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
