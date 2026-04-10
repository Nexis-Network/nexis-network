"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import PortfolioPageClient from "@/components/settings/portfolio/portfolio-page-client";
import { SettingsPage, SettingsPageHeader } from "@/components/settings-v2/primitives/page";
import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import { WalletTransactionHistory } from "@/components/sidebar/wallets/panels/wallet-transaction-history";
import { useWatchlist } from "@/lib/hooks/watchlist/use-watchlist";
import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";
import type { WalletPortfolio } from "@/lib/user/profile";
import type { WalletSnapshot } from "@/modules/wallets/profile";

function toWalletSnapshot(wallet: WalletPortfolio): WalletSnapshot {
  return {
    id: wallet.walletId,
    address: wallet.address ?? null,
    provider: wallet.providerName ?? null,
    label: wallet.label ?? null,
    customLabel: wallet.customLabel ?? null,
    type: wallet.walletType,
    chains: wallet.topChains,
    tokens: [],
    nfts: [],
    totals: {
      tokenCount: wallet.topAssets.length,
      nftCount: 0,
      estimatedValueUsd: wallet.netWorthUsd ?? null,
      nativeValueUsd: wallet.netWorthUsd ?? null,
      totalPnlUsd: wallet.gainLoss24hUsd ?? null,
      totalPnlPercent: wallet.change24hPercent ?? null,
    },
    metadata: wallet.metadata ?? null,
  };
}

function PortfolioTransactionsView() {
  const { data, isLoading } = useProfileAggregate();
  const wallets = useMemo(() => (data?.wallets ?? []).map(toWalletSnapshot), [data?.wallets]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading transactions...</p>;
  }

  if (wallets.length === 0) {
    return (
      <SettingsPanel title="Transaction history" description="Connect a wallet to inspect recent activity.">
        <p className="text-sm text-muted-foreground">No wallets connected yet.</p>
      </SettingsPanel>
    );
  }

  return (
    <SettingsPage className="space-y-6">
      <SettingsPageHeader
        title="Transaction history"
        description="Review per-wallet activity across embedded, connected, and agent-linked accounts."
      />

      <div className="space-y-4">
        {wallets.map((wallet) => (
          <SettingsPanel
            key={wallet.id}
            title={wallet.customLabel ?? wallet.label ?? wallet.provider ?? "Wallet"}
            description={wallet.address ?? "Wallet activity"}
            contentClassName="px-3 py-3"
          >
            <WalletTransactionHistory wallet={wallet} />
          </SettingsPanel>
        ))}
      </div>
    </SettingsPage>
  );
}

function PortfolioWatchlistView() {
  const { items, isLoading, error } = useWatchlist("usd");

  return (
    <SettingsPage className="space-y-6">
      <SettingsPageHeader
        title="Watchlist"
        description="Track monitored assets, price moves, and momentum changes from one list."
      />

      <SettingsPanel title="Tracked assets" description="Assets in your default watchlist.">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading watchlist...</p>
        ) : error ? (
          <p className="text-sm text-red-300">{error instanceof Error ? error.message : "Unable to load watchlist."}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No watchlist assets yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.displayName ?? item.name ?? item.symbol ?? item.assetId}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {[item.symbol, item.chainName].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {typeof item.quote?.price === "number" ? `$${item.quote.price.toFixed(2)}` : "—"}
                  </p>
                  <p
                    className={`text-xs ${
                      (item.quote?.priceChangePct ?? 0) >= 0 ? "text-emerald-500" : "text-destructive"
                    }`}
                  >
                    {typeof item.quote?.priceChangePct === "number"
                      ? `${item.quote.priceChangePct >= 0 ? "+" : ""}${item.quote.priceChangePct.toFixed(2)}%`
                      : "No change data"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsPanel>
    </SettingsPage>
  );
}

export function SettingsPortfolioSection() {
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view") ?? "overview";

  if (activeView === "transactions") {
    return <PortfolioTransactionsView />;
  }

  if (activeView === "watchlist") {
    return <PortfolioWatchlistView />;
  }

  return <PortfolioPageClient />;
}
