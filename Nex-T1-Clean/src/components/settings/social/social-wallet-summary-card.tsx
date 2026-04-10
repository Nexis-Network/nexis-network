"use client";

import Link from "next/link";
import { useMemo } from "react";

import { BentoCard } from "@/components/settings/shared/bento-card";
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

type SocialWalletSummaryCardProps = {
  profile?: ProfileAggregate;
  isLoading: boolean;
};

export function SocialWalletSummaryCard({
  profile,
  isLoading,
}: SocialWalletSummaryCardProps) {
  const wallets = useMemo(() => (Array.isArray(profile?.wallets) ? profile.wallets : []), [profile?.wallets]);
  const integrations = useMemo(
    () => (Array.isArray(profile?.integrations) ? profile.integrations : []),
    [profile?.integrations],
  );
  const totalNetWorth = wallets.reduce((sum, wallet) => {
    const value = typeof wallet.netWorthUsd === "number" && Number.isFinite(wallet.netWorthUsd) ? wallet.netWorthUsd : 0;
    return sum + value;
  }, 0);

  const embeddedWalletCount = useMemo(
    () => wallets.filter((wallet) => isEmbeddedWallet(wallet)).length,
    [wallets],
  );

  const externalWalletCount = Math.max(wallets.length - embeddedWalletCount, 0);

  const activeConnections = useMemo(
    () =>
      integrations.filter((integration) => {
        const status = integration.status?.toLowerCase() ?? "";
        return status !== "revoked" && status !== "disconnected" && status !== "failed" && status !== "error";
      }).length,
    [integrations],
  );

  const chainCount = useMemo(() => {
    const set = new Set<string>();
    for (const wallet of wallets) {
      for (const chain of wallet.topChains) {
        if (chain.name) {
          set.add(chain.name.toLowerCase());
        }
      }
    }
    return set.size;
  }, [wallets]);

  const providerLabels = useMemo(() => {
    const labels = new Set<string>();
    for (const wallet of wallets) {
      if (wallet.providerName?.trim()) {
        labels.add(wallet.providerName.trim());
      }
    }
    for (const integration of integrations) {
      if (integration.provider?.trim()) {
        labels.add(integration.provider.trim());
      }
    }
    return Array.from(labels).slice(0, 6);
  }, [integrations, wallets]);

  return (
    <BentoCard>
      <h3 className="text-sm font-medium text-[var(--bento-text-primary)]">Nex Wallet + connection summary</h3>
      <p className="mt-1 text-xs text-[var(--bento-text-muted)]">
        Nex Wallet and connection state from your live account integrations.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-[var(--bento-border)] bg-[var(--bento-bg)] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--bento-text-muted)]">Wallets</p>
          <p className="font-mono text-lg text-[var(--bento-text-primary)]">
            {isLoading ? "..." : wallets.length.toLocaleString("en-US")}
          </p>
        </div>
        <div className="rounded-md border border-[var(--bento-border)] bg-[var(--bento-bg)] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--bento-text-muted)]">Nex Wallets</p>
          <p className="font-mono text-lg text-[var(--bento-text-primary)]">
            {isLoading ? "..." : embeddedWalletCount.toLocaleString("en-US")}
          </p>
        </div>
        <div className="rounded-md border border-[var(--bento-border)] bg-[var(--bento-bg)] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--bento-text-muted)]">External / Other</p>
          <p className="font-mono text-lg text-[var(--bento-text-primary)]">
            {isLoading ? "..." : externalWalletCount.toLocaleString("en-US")}
          </p>
        </div>
        <div className="rounded-md border border-[var(--bento-border)] bg-[var(--bento-bg)] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--bento-text-muted)]">Active connections</p>
          <p className="font-mono text-lg text-[var(--bento-text-primary)]">
            {isLoading ? "..." : activeConnections.toLocaleString("en-US")}
          </p>
        </div>
        <div className="rounded-md border border-[var(--bento-border)] bg-[var(--bento-bg)] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--bento-text-muted)]">Networks</p>
          <p className="font-mono text-lg text-[var(--bento-text-primary)]">
            {isLoading ? "..." : chainCount.toLocaleString("en-US")}
          </p>
        </div>
        <div className="rounded-md border border-[var(--bento-border)] bg-[var(--bento-bg)] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--bento-text-muted)]">Net worth (USD)</p>
          <p className="font-mono text-lg text-[var(--bento-text-primary)]">
            {isLoading
              ? "..."
              : new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 2,
                }).format(totalNetWorth)}
          </p>
        </div>
      </div>

      {providerLabels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {providerLabels.map((provider) => (
            <span
              key={provider}
              className="rounded-full border border-[var(--bento-border)] px-2 py-0.5 text-[10px] text-[var(--bento-text-muted)]"
            >
              {provider}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 grid gap-2">
        <Button asChild variant="outline" className="justify-start">
          <Link href="/settings/wallets">Manage wallet details</Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link href="/settings/connections">Manage linked connections</Link>
        </Button>
      </div>
    </BentoCard>
  );
}
