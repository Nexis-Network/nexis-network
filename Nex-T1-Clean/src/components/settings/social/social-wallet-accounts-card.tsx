"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, Wallet } from "lucide-react";

import { BentoCard } from "@/components/settings/shared/bento-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import type { ProfileAggregate, WalletPortfolio } from "@/lib/user/profile";

function isEmbeddedWallet(wallet: WalletPortfolio) {
  if (wallet.walletType === "embedded") {
    return true;
  }

  const provider = wallet.providerName?.toLowerCase() ?? "";
  if (provider.includes("cdp") || provider.includes("coinbase")) {
    return true;
  }

  const metadata =
    wallet.metadata && typeof wallet.metadata === "object" && !Array.isArray(wallet.metadata)
      ? (wallet.metadata as Record<string, UntypedJson>)
      : null;

  const metadataProvider = typeof metadata?.provider === "string" ? metadata.provider.toLowerCase() : "";
  const metadataWalletType = typeof metadata?.walletType === "string" ? metadata.walletType.toLowerCase() : "";

  return (
    metadataProvider.includes("cdp") ||
    metadataProvider.includes("coinbase") ||
    metadataWalletType.includes("embedded") ||
    metadataWalletType.includes("cdp")
  );
}

function walletTypeLabel(wallet: WalletPortfolio) {
  if (isEmbeddedWallet(wallet)) return "Nex Wallet";
  if (wallet.walletType === "external_connected") return "External";
  if (wallet.walletType === "agent_generated") return "Agent";
  if (wallet.walletType === "ledger") return "Ledger";
  return wallet.walletType;
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "\u2014";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function truncateAddress(address: string) {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

type SocialWalletAccountsCardProps = {
  profile?: ProfileAggregate;
  isLoading: boolean;
};

export function SocialWalletAccountsCard({
  profile,
  isLoading,
}: SocialWalletAccountsCardProps) {
  const wallets = useMemo(() => (Array.isArray(profile?.wallets) ? profile.wallets : []), [profile?.wallets]);

  const rankedWallets = useMemo(() => {
    return [...wallets]
      .sort((a, b) => {
        const aEmbedded = isEmbeddedWallet(a) ? 1 : 0;
        const bEmbedded = isEmbeddedWallet(b) ? 1 : 0;
        if (aEmbedded !== bEmbedded) {
          return bEmbedded - aEmbedded;
        }

        const aValue = typeof a.netWorthUsd === "number" && Number.isFinite(a.netWorthUsd) ? a.netWorthUsd : 0;
        const bValue = typeof b.netWorthUsd === "number" && Number.isFinite(b.netWorthUsd) ? b.netWorthUsd : 0;
        return bValue - aValue;
      })
      .slice(0, 6);
  }, [wallets]);

  return (
    <BentoCard>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="settings-card-title">Wallet Accounts</h3>
          <p className="settings-card-description">
            Live Nex Wallet and external wallet account details.
          </p>
        </div>
        <Badge variant="outline">
          <Wallet className="h-3.5 w-3.5" />
          {isLoading ? "..." : wallets.length.toLocaleString("en-US")}
        </Badge>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="settings-inline-section text-xs text-[var(--bento-text-muted)]">
            Loading wallet accounts...
          </div>
        ) : rankedWallets.length === 0 ? (
          <div className="settings-inline-section text-center text-xs text-[var(--bento-text-muted)]">
            No wallet accounts found yet.
          </div>
        ) : (
          <div className="settings-inline-list">
            {rankedWallets.map((wallet) => {
              const label = wallet.customLabel?.trim() || wallet.label?.trim() || wallet.providerName?.trim() || wallet.walletId;
              const chains = (Array.isArray(wallet.topChains) ? wallet.topChains : [])
                .map((chain) => chain.name)
                .filter(Boolean)
                .slice(0, 2);
              const assets = (Array.isArray(wallet.topAssets) ? wallet.topAssets : [])
                .map((asset) => asset.symbol)
                .filter(Boolean)
                .slice(0, 2);
              const status = wallet.status?.trim() || "active";

              return (
                <div
                  key={wallet.walletId}
                  className="settings-inline-row"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <p className="truncate text-sm font-medium text-[var(--bento-text-primary)]">{label}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--bento-text-muted)]">
                        <span>{walletTypeLabel(wallet)}</span>
                        <span>-</span>
                        <span className="capitalize">{status}</span>
                        {chains.length > 0 ? (
                          <>
                            <span>-</span>
                            <span>Chains: {chains.join(", ")}</span>
                          </>
                        ) : null}
                        {assets.length > 0 ? (
                          <>
                            <span>-</span>
                            <span>Assets: {assets.join(", ")}</span>
                          </>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-[var(--bento-text-muted)]">
                        {wallet.address ? truncateAddress(wallet.address) : "No address"}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--bento-text-primary)]">{formatCurrency(wallet.netWorthUsd)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3">
        <Button asChild variant="outline" className="settings-surface-button w-full justify-between">
          <Link href="/settings/wallets">
            Open wallet controls
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </BentoCard>
  );
}
