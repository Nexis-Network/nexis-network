"use client";

import { useMemo, useState, useCallback } from "react";
import Image from "next/image";
import {
  Copy,
  Check,
  ExternalLink,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import {
  useAgentPortfolio,
  type AgentWalletSummary,
} from "@/lib/hooks/agents/use-agent-portfolio";

function formatCurrency(value: number): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  });
  return formatter.format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

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

function classifyChain(chainId: number | string): "evm" | "solana" {
  const id = String(chainId).toLowerCase();
  if (id === "solana" || id === "101") return "solana";
  return "evm";
}

function CopyableAddress({
  address,
  chainId,
}: {
  address: string;
  chainId: number | string;
}) {
  const [copied, setCopied] = useState(false);
  const chain = getChainMeta(chainId);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [address]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative size-4 shrink-0 overflow-hidden rounded-full">
        <Image src={chain.icon} alt={chain.name} fill sizes="16px" className="object-contain" />
      </div>
      <span className="font-mono text-xs text-muted-foreground">
        {truncateAddress(address)}
      </span>
      <Badge variant="outline" className="text-[10px] px-1 py-0">
        {chain.name}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleCopy}
        title="Copy address"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
        <a
          href={chain.explorerUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          title="View on explorer"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </Button>
    </div>
  );
}

type AgentWalletSectionProps = {
  agentId: string;
  isOwner?: boolean;
  onFundAgent?: (agentId: string) => void;
};

export function AgentWalletSection({
  agentId,
  isOwner = false,
  onFundAgent,
}: AgentWalletSectionProps) {
  const portfolioQuery = useAgentPortfolio(agentId);

  const portfolio = portfolioQuery.data;
  const isLoading = portfolioQuery.isLoading;
  const error = portfolioQuery.error;

  const { evmWallets, solanaWallets, evmTotal, solanaTotal } = useMemo(() => {
    if (!portfolio) {
      return { evmWallets: [], solanaWallets: [], evmTotal: 0, solanaTotal: 0 };
    }

    const evm: AgentWalletSummary[] = [];
    const sol: AgentWalletSummary[] = [];
    let evmSum = 0;
    let solSum = 0;

    for (const wallet of portfolio.wallets) {
      const type = classifyChain(wallet.chainId);
      if (type === "solana") {
        sol.push(wallet);
        solSum += wallet.balanceUsd;
      } else {
        evm.push(wallet);
        evmSum += wallet.balanceUsd;
      }
    }

    return {
      evmWallets: evm,
      solanaWallets: sol,
      evmTotal: evmSum,
      solanaTotal: solSum,
    };
  }, [portfolio]);

  if (isLoading) {
    return (
      <Card className="border-white/10 bg-white/[0.02]">
        <CardContent className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-white/10 bg-white/[0.02]">
        <CardContent className="flex h-48 flex-col items-center justify-center gap-2">
          <AlertCircle className="h-6 w-6 text-destructive/70" />
          <p className="text-sm text-muted-foreground">
            Failed to load portfolio
          </p>
          <p className="text-xs text-muted-foreground/60">
            {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!portfolio || portfolio.wallets.length === 0) {
    return (
      <Card className="border-white/10 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-base text-white">Wallets</CardTitle>
        </CardHeader>
        <CardContent className="flex h-32 flex-col items-center justify-center gap-2">
          <Wallet className="h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-500">No wallets provisioned</p>
          <p className="text-xs text-zinc-600">
            Provision wallets to enable on-chain operations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const pnlIsPositive = portfolio.pnlUsd >= 0;

  return (
    <Card className="border-white/10 bg-white/[0.02]">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base text-white">
            Agent Wallets
          </CardTitle>
          <p className="text-xs text-muted-foreground/70">
            Portfolio overview and wallet addresses
          </p>
        </div>
        {isOwner && onFundAgent && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-white/10 text-xs"
            onClick={() => onFundAgent(agentId)}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Fund Agent
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
              Net Worth
            </p>
            <p className="mt-1 text-lg font-medium text-white">
              {formatCurrency(portfolio.netWorthUsd)}
            </p>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
              EVM
            </p>
            <p className="mt-1 text-lg font-medium text-white">
              {formatCurrency(evmTotal)}
            </p>
            <p className="text-[10px] text-muted-foreground/50">
              {evmWallets.length} wallet{evmWallets.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
              Solana
            </p>
            <p className="mt-1 text-lg font-medium text-white">
              {formatCurrency(solanaTotal)}
            </p>
            <p className="text-[10px] text-muted-foreground/50">
              {solanaWallets.length} wallet{solanaWallets.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <div className="flex items-center gap-2">
            {pnlIsPositive ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-400" />
            )}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                Total P&L
              </p>
              <p
                className={cn(
                  "text-sm font-medium font-mono",
                  pnlIsPositive ? "text-emerald-300" : "text-rose-300",
                )}
              >
                {formatCurrency(portfolio.pnlUsd)}
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
              Return
            </p>
            <p
              className={cn(
                "text-sm font-medium font-mono",
                pnlIsPositive ? "text-emerald-300" : "text-rose-300",
              )}
            >
              {formatPercent(portfolio.pnlPercent)}
            </p>
          </div>

          <div className="ml-auto text-[10px] text-muted-foreground/40">
            Updated{" "}
            {new Date(portfolio.updatedAt).toLocaleString(undefined, {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-400">Addresses</p>
          <div className="space-y-1.5">
            {portfolio.wallets.map((wallet) => (
              <div
                key={wallet.address}
                className="flex items-center justify-between rounded-md border border-border/30 bg-card/30 px-3 py-2"
              >
                <CopyableAddress
                  address={wallet.address}
                  chainId={wallet.chainId}
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatCurrency(wallet.balanceUsd)}
                  </span>
                  <Badge
                    variant={
                      wallet.status === "active"
                        ? "default"
                        : wallet.status === "revoked"
                          ? "destructive"
                          : "secondary"
                    }
                    className="text-[10px] px-1.5 py-0"
                  >
                    {wallet.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
