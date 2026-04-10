"use client";

import { useState, useCallback } from "react";
import { Copy, Check, ExternalLink, Key } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import {
  walletLedgerActionButtonClass,
  walletLedgerIconFrameClass,
  walletLedgerInlineFrameClass,
  walletLedgerSubLabelClass,
} from "@/lib/ui/wallet-ledger";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AgentWalletInfo = {
  address: string;
  platform: string;
  chainId: number | string;
  label: string | null;
  status: "active" | "provisioning" | "revoked";
  generation: number;
};

type AgentWalletCardProps = {
  wallet: AgentWalletInfo;
  agentId: string;
  isOwner: boolean;
  onExportKey?: (address: string) => void;
  className?: string;
};

type ChainMeta = {
  name: string;
  icon: string;
  explorerUrl: (address: string) => string;
};

const CHAIN_REGISTRY: Record<string, ChainMeta> = {
  "1": {
    name: "Ethereum",
    icon: LIQUID_GLASS_LOGOS.ethereum,
    explorerUrl: (a) => `https://etherscan.io/address/${a}`,
  },
  "8453": {
    name: "Base",
    icon: "/icons/chain-icons/base.svg",
    explorerUrl: (a) => `https://basescan.org/address/${a}`,
  },
  "10": {
    name: "Optimism",
    icon: "/icons/chain-icons/optimism.svg",
    explorerUrl: (a) => `https://optimistic.etherscan.io/address/${a}`,
  },
  "137": {
    name: "Polygon",
    icon: "/icons/chain-icons/polygon.svg",
    explorerUrl: (a) => `https://polygonscan.com/address/${a}`,
  },
  "42161": {
    name: "Arbitrum",
    icon: "/icons/chain-icons/arbitrum.svg",
    explorerUrl: (a) => `https://arbiscan.io/address/${a}`,
  },
  solana: {
    name: "Solana",
    icon: LIQUID_GLASS_LOGOS.solana,
    explorerUrl: (a) => `https://solscan.io/account/${a}`,
  },
  "101": {
    name: "Solana",
    icon: LIQUID_GLASS_LOGOS.solana,
    explorerUrl: (a) => `https://solscan.io/account/${a}`,
  },
};

const DEFAULT_CHAIN_META: ChainMeta = {
  name: "Unknown",
  icon: LIQUID_GLASS_LOGOS.ethereum,
  explorerUrl: (a) => `https://etherscan.io/address/${a}`,
};

function getChainMeta(chainId: number | string): ChainMeta {
  return CHAIN_REGISTRY[String(chainId)] ?? DEFAULT_CHAIN_META;
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function platformLabel(platform: string): string {
  const map: Record<string, string> = {
    cdp: "Nex Wallet",
    thirdweb: "Legacy Embedded",
    safe: "Safe",
    eoa: "EOA",
    phantom: "Phantom",
  };
  return map[platform.toLowerCase()] ?? platform;
}

function statusVariant(
  status: AgentWalletInfo["status"],
): "default" | "secondary" | "destructive" {
  switch (status) {
    case "active":
      return "default";
    case "provisioning":
      return "secondary";
    case "revoked":
      return "destructive";
  }
}

export function AgentWalletCard({
  wallet,
  agentId: _agentId,
  isOwner,
  onExportKey,
  className,
}: AgentWalletCardProps) {
  const [copied, setCopied] = useState(false);
  const chain = getChainMeta(wallet.chainId);

  const handleCopy = useCallback(() => {
    if (!wallet.address) return;
    navigator.clipboard.writeText(wallet.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [wallet.address]);

  const handleExport = useCallback(() => {
    onExportKey?.(wallet.address);
  }, [onExportKey, wallet.address]);

  return (
    <div
      className={cn(
        walletLedgerInlineFrameClass,
        "flex items-center justify-between gap-3 px-3.5 py-3",
        className,
      )}
    >
      {/* Left: chain icon + info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(walletLedgerIconFrameClass, "relative h-11 w-11 rounded-[14px] flex-shrink-0")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={chain.icon}
            alt={chain.name}
            className="h-8 w-8 rounded-full"
          />
        </div>

        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-white">
              {wallet.label ?? `${chain.name} Wallet`}
            </p>
            <Badge variant={statusVariant(wallet.status)} className="px-1.5 py-0 text-[10px]">
              {wallet.status}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <p className={cn(walletLedgerSubLabelClass, "font-mono")}>
              {truncateAddress(wallet.address)}
            </p>
            <Badge variant="outline" className="border-white/[0.08] bg-white/[0.03] px-1 py-0 text-[10px] text-white/55">
              {platformLabel(wallet.platform)}
            </Badge>
            {wallet.generation > 1 && (
              <span className="text-[10px] text-white/35">
                gen {wallet.generation}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className={cn(walletLedgerActionButtonClass, "h-8 w-8")}
          onClick={handleCopy}
          title="Copy address"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(walletLedgerActionButtonClass, "h-8 w-8")}
          asChild
        >
          <a
            href={chain.explorerUrl(wallet.address)}
            target="_blank"
            rel="noopener noreferrer"
            title="View on explorer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>

        {isOwner && onExportKey && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(walletLedgerActionButtonClass, "h-8 w-8")}
            onClick={handleExport}
            title="Export wallet key"
          >
            <Key className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
