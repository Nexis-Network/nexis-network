"use client";

import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";

import { cn } from "@/lib/utils";
import type { ProfileAggregate, WalletPortfolio } from "@/lib/user/profile";
import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";
import { Skeleton } from "@/components/ui/skeleton";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { MonoValue } from "@/components/settings/shared/mono-value";
import { CurrencyDisplay } from "@/components/settings/shared/currency-display";
import { SettingsPage, SettingsPageHeader } from "@/components/settings-v2/primitives/page";

type Props = { initialProfile?: ProfileAggregate };

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function safeNum(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export default function PortfolioPageClient({ initialProfile }: Props) {
  const { data: profile, isLoading } = useProfileAggregate({ initialData: initialProfile });
  const wallets = useMemo(() => profile?.wallets ?? [], [profile?.wallets]);

  const totals = useMemo(() => {
    let netWorth = 0;
    let change24h = 0;
    for (const w of wallets) {
      netWorth += safeNum(w.netWorthUsd);
      change24h += safeNum(w.gainLoss24hUsd);
    }
    const changePercent = netWorth > 0 ? (change24h / (netWorth - change24h)) * 100 : 0;
    return { netWorth, change24h, changePercent };
  }, [wallets]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <SettingsPage className="space-y-6">
      <SettingsPageHeader
        title="Portfolio"
        description="Aggregated view of all your wallet balances and holdings."
      />

      {/* Net Worth Summary */}
      <BentoCard>
        <div className="space-y-1">
          <p className="text-xs text-[var(--bento-text-muted)]">Total Net Worth</p>
          <p className="text-3xl font-semibold">
            <MonoValue>{USD.format(totals.netWorth)}</MonoValue>
          </p>
          <div className="flex items-center gap-2">
            {totals.change24h !== 0 && (
              <>
                {totals.change24h > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                )}
                <CurrencyDisplay value={totals.change24h} />
                <span className={cn("text-xs", totals.changePercent >= 0 ? "text-green-400" : "text-red-400")}>
                  <MonoValue>({totals.changePercent >= 0 ? "+" : ""}{totals.changePercent.toFixed(2)}%)</MonoValue>
                </span>
              </>
            )}
            <span className="text-xs text-[var(--bento-text-muted)]">24h</span>
          </div>
        </div>
      </BentoCard>

      {/* Wallet Cards */}
      {wallets.length === 0 ? (
        <BentoCard>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Wallet className="mb-2 h-8 w-8 text-[var(--bento-text-muted)]" />
            <p className="text-sm text-[var(--bento-text-muted)]">No wallets connected yet.</p>
            <p className="text-xs text-[var(--bento-text-muted)]">Connect a wallet in the Wallets settings to see your portfolio.</p>
          </div>
        </BentoCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {wallets.map((w) => (
            <WalletCard key={w.walletId} wallet={w} />
          ))}
        </div>
      )}
    </SettingsPage>
  );
}

function WalletCard({ wallet }: { wallet: WalletPortfolio }) {
  const netWorth = safeNum(wallet.netWorthUsd);
  const change = safeNum(wallet.change24hPercent);

  return (
    <BentoCard>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--bento-text-primary)]">
              {wallet.customLabel ?? wallet.label ?? wallet.providerName ?? "Wallet"}
            </p>
            {wallet.address && (
              <p className="truncate font-mono text-xs text-[var(--bento-text-muted)]">
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              <MonoValue>{USD.format(netWorth)}</MonoValue>
            </p>
            {change !== 0 && (
              <p className={cn("text-xs", change >= 0 ? "text-green-400" : "text-red-400")}>
                <MonoValue>{change >= 0 ? "+" : ""}{change.toFixed(2)}%</MonoValue>
              </p>
            )}
          </div>
        </div>

        {/* Top Assets */}
        {wallet.topAssets.length > 0 && (
          <div className="space-y-1">
            {wallet.topAssets.slice(0, 4).map((asset) => (
              <div key={asset.symbol} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  {asset.icon && (
                    <Image src={asset.icon} alt={asset.symbol} width={14} height={14} className="rounded-full" unoptimized />
                  )}
                  <span className="text-[var(--bento-text-muted)]">{asset.symbol}</span>
                </div>
                <span className="text-[var(--bento-text-primary)]/80">{asset.name ?? asset.symbol}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </BentoCard>
  );
}
