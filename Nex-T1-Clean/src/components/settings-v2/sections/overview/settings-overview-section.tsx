"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  useLocale,
  useTranslations,
} from "@/components/providers/locale-provider";
import {
  SettingsPage,
  SettingsPageHeader,
} from "@/components/settings-v2/primitives/page";
import { SettingsActivityGraphCard } from "@/components/settings-v2/sections/overview/settings-activity-graph-card";
import { SettingsPortfolioAllocationCard } from "@/components/settings-v2/sections/overview/settings-portfolio-allocation-card";
import {
  ALL_WALLETS_SCOPE,
  buildOverviewEmbeddedWallets,
  findOverviewEmbeddedWallet,
  resolveOverviewWalletNetWorth,
} from "@/components/settings-v2/sections/overview/settings-overview-wallets";
import { SettingsUsageStatsCard } from "@/components/settings-v2/sections/overview/settings-usage-stats-card";
import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";
import { useNotifications } from "@/lib/hooks/user/use-notifications";
import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";
import type { SettingsPortfolioWalletFilter } from "@/lib/portfolio/settings-summary";
import { cn } from "@/lib/utils";

function formatCurrency(value: number | null | undefined, locale: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  });
}

function unreadNotificationCount(
  items: ReturnType<typeof useNotifications>["data"],
) {
  return (items ?? []).reduce((count, item) => {
    const metadata =
      item.metadata &&
      typeof item.metadata === "object" &&
      !Array.isArray(item.metadata)
        ? item.metadata
        : null;
    return metadata?.read === true ? count : count + 1;
  }, 0);
}

function SettingsKpiCard({
  label,
  value,
  description,
  accent,
}: {
  label: string;
  value: string;
  description?: string;
  accent?: "default" | "cyan";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-card px-4 py-4 shadow-none",
        accent === "cyan" && "bg-muted/40",
      )}
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function SettingsReferralCard() {
  const t = useTranslations("app");

  return (
    <Link
      href="/settings/workspace?tab=rewards"
      className="group rounded-xl border border-border/70 bg-card px-4 py-4 shadow-none transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {t("settingsOverview.referFriend")}
          </p>
          <p className="text-sm leading-5 text-muted-foreground">
            {t("settingsOverview.earnRewards")}
          </p>
        </div>
        <ArrowUpRight className="size-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

export function SettingsOverviewSection() {
  const { data: profile, isLoading: profileLoading } = useProfileAggregate();
  const { data: notifications = [] } = useNotifications();
  const locale = useLocale();
  const t = useTranslations("app");

  const wallets = useMemo(() => profile?.wallets ?? [], [profile?.wallets]);
  const cdpWallets = useResolvedCdpWallets({
    fallbackWallets: wallets,
  });
  const embeddedWallets = useMemo(
    () =>
      buildOverviewEmbeddedWallets({
        profileWallets: wallets,
        evmAddress: cdpWallets.evmAddress,
        solanaAddress: cdpWallets.solanaAddress,
      }),
    [wallets, cdpWallets.evmAddress, cdpWallets.solanaAddress],
  );
  const [walletScope, setWalletScope] =
    useState<SettingsPortfolioWalletFilter>(ALL_WALLETS_SCOPE);

  useEffect(() => {
    if (walletScope === ALL_WALLETS_SCOPE) {
      return;
    }

    if (!findOverviewEmbeddedWallet(embeddedWallets, walletScope)) {
      setWalletScope(ALL_WALLETS_SCOPE);
    }
  }, [embeddedWallets, walletScope]);

  const walletsConnected = wallets.length;
  const totalNetWorth = wallets.reduce(
    (sum, wallet) => sum + (wallet.netWorthUsd ?? 0),
    0,
  );
  const displayedNetWorth =
    embeddedWallets.length > 0
      ? resolveOverviewWalletNetWorth(embeddedWallets, walletScope)
      : totalNetWorth;

  const unreadCount = unreadNotificationCount(notifications);

  return (
    <SettingsPage className="space-y-8">
      <SettingsPageHeader
        title="Overview"
        description="Wallet health, usage, recent activity, and quick actions in one place."
      />

      <section className="space-y-4">
        <SettingsPortfolioAllocationCard
          embeddedWallets={embeddedWallets}
          walletScope={walletScope}
          onWalletScopeChange={setWalletScope}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SettingsKpiCard
            label={t("settingsOverview.walletsConnected")}
            value={profileLoading ? "…" : String(walletsConnected)}
            description="Connected across embedded and external accounts"
            accent="cyan"
          />
          <SettingsKpiCard
            label={t("settingsOverview.netWorth")}
            value={
              profileLoading ? "…" : formatCurrency(displayedNetWorth, locale)
            }
            description="Current tracked total"
          />
          <SettingsKpiCard
            label={t("settingsOverview.unreadNotifications")}
            value={String(unreadCount)}
            description="Unread social and execution alerts"
          />
          <SettingsReferralCard />
        </div>
      </section>

      <SettingsUsageStatsCard />

      <SettingsActivityGraphCard
        title={t("settingsOverview.activityTitle")}
        description={t("settingsOverview.activityDescription")}
      />
    </SettingsPage>
  );
}
