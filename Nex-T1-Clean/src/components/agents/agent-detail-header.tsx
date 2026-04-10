"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatDistanceToNowStrict } from "date-fns";
import { Copy, Share2, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { LazyOrb } from "@/components/ui/lazy-orb";
import type { AgentDetail } from "@/lib/agents/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AttestationBadge } from "@/components/agents/attestation-badge";
import { useAgentPortfolio } from "@/lib/hooks/agents/use-agent-portfolio";
import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";
import { useCdpBalance } from "@/lib/hooks/cdp/use-cdp-balance";
import { resolveAvatarImageSrc } from "@/lib/avatar-image-fallback";
import { getOrbColors } from "@/lib/marketplace/utils";

import { logger } from '@/lib/logger';
type AgentDetailHeaderProps = {
  agent: AgentDetail["agent"];
  versionsCount: number;
  latestDeployment?: {
    status: string;
    provider?: string | null;
  };
};

export function AgentDetailHeader({ agent, versionsCount, latestDeployment }: AgentDetailHeaderProps) {
  const router = useRouter();
  const { data: portfolio } = useAgentPortfolio(agent.id);
  const { evmAddress: cdpEvmAddr } = useResolvedCdpWallets();
  const { data: cdpEvmBal } = useCdpBalance(cdpEvmAddr, "evm", 8453);

  // Parse Avatar / Orb Protocol
  const isOrb = agent.avatarUrl?.startsWith("orb:");
  const orbColors = getOrbColors(agent.avatarUrl) ?? ["#0ea5e9", "#38bdf8"];

  const createdRelative = useMemo(() => {
    try {
      return formatDistanceToNowStrict(new Date(agent.createdAt), { addSuffix: true });
    } catch {
      return "Recently created";
    }
  }, [agent.createdAt]);

  const [copying, setCopying] = useState(false);
  const [copyingAgent, setCopyingAgent] = useState(false);

  const handleCopyLink = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      setCopying(true);
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      toast.success("Link copied", { description: "Share this agent with your team." });
    } catch (error) {
      logger.error("Failed to copy agent link", error);
      toast.error("Unable to copy link");
    } finally {
      setCopying(false);
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: agent.name,
          text: agent.description ?? undefined,
          url: window.location.href,
        });
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          logger.error("Share failed", error);
          toast.error("Unable to share link");
        }
      }
    } else {
      handleCopyLink();
    }
  }, [agent.description, agent.name, handleCopyLink]);

  const handleCopyAgent = useCallback(async () => {
    try {
      setCopyingAgent(true);
      const response = await fetch(`/api/agents/${agent.id}/copy`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message ?? payload?.error ?? `Copy failed (${response.status})`);
      }
      toast.success("Agent copied", { description: "A private copy was created in your workspace." });
      const nextId = payload?.agent?.id;
      if (typeof nextId === "string" && nextId.trim()) {
        router.push(`/agents/${nextId}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to copy agent";
      toast.error(message);
    } finally {
      setCopyingAgent(false);
    }
  }, [agent.id, router]);

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-white/[0.01] p-6 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.6)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        
        {/* Helper Wrapper for Avatar + Info */}
        <div className="flex items-start gap-6">
            
            {/* Avatar Section */}
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-white/10 bg-marketplace-app shadow-2xl">
              {isOrb ? (
                 <div className="w-full h-full transform scale-110">
                   <LazyOrb colors={orbColors} variant="agent" />
                 </div>
              ) : (
                <Image
                  src={resolveAvatarImageSrc(agent.avatarUrl, agent.slug)}
                  alt={agent.name}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            {/* Info Section */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-wide", visibilityTone(agent.visibility))}>
                  {agent.visibility === "public" ? "Public" : agent.visibility === "unlisted" ? "Unlisted" : "Private"}
                </Badge>
                {latestDeployment ? (
                  <AttestationBadge
                    status={latestDeployment.status === "running" ? "verified" : latestDeployment.status === "failed" ? "failed" : "pending"}
                    provider={latestDeployment.provider}
                  />
                ) : null}
                <span className="text-xs uppercase tracking-wide text-muted-foreground/80">
                  Created {createdRelative}
                </span>
              </div>
              <h1 className="text-3xl font-regular text-white sm:text-4xl">{agent.name}</h1>
              <p className="text-sm text-muted-foreground">
                {agent.slug} • {versionsCount} version{versionsCount === 1 ? "" : "s"}
              </p>
            </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/marketplace?q=${encodeURIComponent(agent.name)}`}>Marketplace</Link>
          </Button>
          {agent.visibility === "public" || agent.visibility === "unlisted" ? (
            <Button variant="outline" size="sm" onClick={handleCopyAgent} disabled={copyingAgent} className="gap-2">
              <Copy className="h-4 w-4" />
              Copy agent
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={handleCopyLink} disabled={copying} className="gap-2">
            <Copy className="h-4 w-4" />
            Copy link
          </Button>
          <Button variant="default" size="sm" onClick={handleShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
      {agent.description ? (
        <p className="max-w-3xl text-base text-muted-foreground/90">{agent.description}</p>
      ) : (
        <p className="text-sm italic text-muted-foreground/70">This agent has no public description yet.</p>
      )}
      {portfolio && portfolio.wallets.length > 0 ? (
        <AgentWalletInfo portfolio={portfolio} />
      ) : null}
      {cdpEvmAddr && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span className="font-mono">{cdpEvmAddr.slice(0, 6)}...{cdpEvmAddr.slice(-4)}</span>
          {cdpEvmBal?.totalUsdValue != null && (
            <span className="text-white">${cdpEvmBal.totalUsdValue.toFixed(2)}</span>
          )}
        </div>
      )}
      <HeaderPerformance performance={agent.performance} />
    </div>
  );
}

function AgentWalletInfo({ portfolio }: { portfolio: ReturnType<typeof useAgentPortfolio>["data"] }) {
  if (!portfolio || portfolio.wallets.length === 0) return null;

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied");
    } catch {
      toast.error("Unable to copy address");
    }
  };

  const pnlPositive = portfolio.pnlUsd >= 0;
  const PnlIcon = pnlPositive ? TrendingUp : TrendingDown;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm">
      {/* Wallet addresses */}
      {portfolio.wallets.map((wallet) => {
        const label = wallet.platform === "solana" ? "SOL" : "EVM";
        const truncated =
          wallet.address.length > 10
            ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
            : wallet.address;

        return (
          <button
            key={wallet.address}
            type="button"
            onClick={() => handleCopyAddress(wallet.address)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-white"
            title={`Copy ${label} address: ${wallet.address}`}
          >
            <Wallet className="h-3 w-3 shrink-0" />
            <span className="font-medium text-white/70">{label}</span>
            <span className="font-mono">{truncated}</span>
            <Copy className="h-3 w-3 shrink-0 opacity-50" />
          </button>
        );
      })}

      {/* Net worth badge */}
      <Badge
        variant="outline"
        className="border-sky-500/30 bg-sky-500/10 text-sky-200"
      >
        {formatCurrency(portfolio.netWorthUsd)} AUM
      </Badge>

      {/* P&L indicator */}
      <div
        className={cn(
          "flex items-center gap-1.5",
          pnlPositive ? "text-emerald-400" : "text-red-400",
        )}
      >
        <PnlIcon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">
          {pnlPositive ? "+" : ""}
          {formatCurrency(portfolio.pnlUsd)}
          {portfolio.pnlPercent !== 0 ? ` (${pnlPositive ? "+" : ""}${portfolio.pnlPercent.toFixed(2)}%)` : ""}
        </span>
      </div>
    </div>
  );
}

function visibilityTone(visibility: AgentDetail["agent"]["visibility"]) {
  switch (visibility) {
    case "public":
      return "border-emerald-500/40 bg-[#8eb94f]/10 text-emerald-100";
    case "unlisted":
      return "border-amber-500/40 bg-amber-500/10 text-amber-100";
    default:
      return "border-slate-500/40 bg-slate-500/10 text-slate-200";
  }
}

function HeaderPerformance({ performance }: { performance?: AgentDetail["agent"]["performance"] }) {
  if (!performance || performance.totalTrades === 0) return null;
  const positive = performance.realizedPnlUsd >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm">
      <div className="flex items-center gap-2 text-white">
        <Icon className={positive ? "h-4 w-4 text-emerald-400" : "h-4 w-4 text-red-400"} />
        <span>{formatCurrency(performance.realizedPnlUsd)} lifetime P&L</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground/80">
        <span>Win rate:</span>
        <Badge variant="outline" className="border-white/10 bg-white/[0.03]">
          {performance.winRatePercent !== null ? `${performance.winRatePercent.toFixed(1)}%` : "—"}
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground/80">
        <span>Avg return:</span>
        <Badge variant="outline" className="border-white/10 bg-white/[0.03]">
          {performance.averageReturnPercent !== null ? `${performance.averageReturnPercent.toFixed(2)}%` : "—"}
        </Badge>
      </div>
      <div className="text-muted-foreground/70">{performance.totalTrades} trades executed</div>
    </div>
  );
}

function formatCurrency(value: number) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  });
  return formatter.format(value);
}
