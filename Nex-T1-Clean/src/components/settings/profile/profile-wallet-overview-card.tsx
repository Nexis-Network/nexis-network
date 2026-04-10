"use client";

import { Wallet, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { BentoCard } from "@/components/settings/shared/bento-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import { Skeleton } from "@/components/ui/skeleton";
import type { WalletAssetSummary, WalletPortfolio } from "@/lib/user/profile";

type ProfileWalletOverviewCardProps = {
  wallets?: WalletPortfolio[];
  isLoading: boolean;
};

export function ProfileWalletOverviewCard({ wallets, isLoading }: ProfileWalletOverviewCardProps) {
  if (isLoading) {
    return (
      <BentoCard>
        <div className="space-y-1">
          <Skeleton className="h-5 w-36 bg-white/5" />
          <Skeleton className="h-4 w-56 bg-white/5" />
        </div>
        <div className="mt-4 space-y-4">
          <Skeleton className="h-10 w-full rounded-md bg-white/5" />
          <Skeleton className="h-20 w-full rounded-md bg-white/5" />
        </div>
      </BentoCard>
    );
  }

  const walletCount = wallets?.length ?? 0;
  const totalNetWorth = wallets?.reduce((sum, wallet) => sum + (wallet.netWorthUsd ?? 0), 0) ?? 0;
  const topAssets = resolveTopAssets(wallets ?? []);
  const topChains = resolveTopChains(wallets ?? []);

  return (
    <BentoCard>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="settings-card-title">Wallet Snapshot</h3>
          <p className="settings-card-description">
            Monitor your connected wallets and portfolio mix.
          </p>
        </div>
        <Badge variant="outline">
          <Wallet className="h-3.5 w-3.5" />
          {walletCount} wallet{walletCount === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="mt-4 space-y-4">
        <div className="settings-inline-section flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="settings-section-label">Estimated net worth</p>
            <p className="mt-1 text-2xl font-regular text-[var(--bento-text-primary)]">
              {Number.isFinite(totalNetWorth) ? formatCurrency(totalNetWorth) : "\u2014"}
            </p>
          </div>
          <Button variant="outline" size="sm" className="settings-surface-button w-fit" asChild>
            <Link href="/settings/wallets">
              Manage wallets
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-3">
          <div>
            <p className="settings-section-label">Top assets</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {topAssets.length === 0 ? (
                <Badge variant="outline">No asset data</Badge>
              ) : (
                topAssets.map((asset) => (
                  <Badge key={asset.symbol} variant="outline">
                    {asset.symbol}
                    {asset.name ? ` \u00b7 ${asset.name}` : ""}
                  </Badge>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="settings-section-label">Primary chains</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {topChains.length === 0 ? (
                <Badge variant="outline">No chain data</Badge>
              ) : (
                topChains.map((chain) => (
                  <Badge key={chain} variant="outline">
                    {chain}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}

function resolveTopAssets(wallets: WalletPortfolio[]): WalletAssetSummary[] {
  const assetMap = new Map<string, WalletAssetSummary & { frequency: number }>();
  wallets.forEach((wallet) => {
    wallet.topAssets?.forEach((asset) => {
      const symbol = asset.symbol?.toUpperCase();
      if (!symbol) return;
      const key = symbol;
      const existing = assetMap.get(key);
      if (existing) {
        existing.frequency += 1;
      } else {
        assetMap.set(key, { ...asset, symbol, frequency: 1 });
      }
    });
  });
  return Array.from(assetMap.values())
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 3)
    .map((entry) => {
      const { frequency: _frequency, ...rest } = entry;
      return rest;
    });
}

function resolveTopChains(wallets: WalletPortfolio[]): string[] {
  const chainFrequency = new Map<string, number>();
  wallets.forEach((wallet) => {
    wallet.topChains?.forEach((chain) => {
      const name = chain.name?.trim();
      if (!name) return;
      chainFrequency.set(name, (chainFrequency.get(name) ?? 0) + 1);
    });
  });
  return Array.from(chainFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}
