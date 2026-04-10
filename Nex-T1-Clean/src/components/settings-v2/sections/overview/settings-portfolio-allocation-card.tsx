"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowUpRight, RefreshCcw } from "lucide-react";

import { useLocale, useTranslations } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import {
  SettingsPortfolioActionChooser,
  type SettingsPortfolioActionKey,
} from "@/components/settings-v2/sections/overview/settings-portfolio-action-chooser";
import { SettingsPortfolioAssetCard } from "@/components/settings-v2/sections/overview/settings-portfolio-asset-card";
import { SettingsPortfolioWalletSelector } from "@/components/settings-v2/sections/overview/settings-portfolio-wallet-selector";
import {
  ALL_WALLETS_SCOPE,
  type OverviewEmbeddedWallet,
  findOverviewEmbeddedWallet,
} from "@/components/settings-v2/sections/overview/settings-overview-wallets";
import { useSettingsPortfolioSummary } from "@/lib/hooks/settings/use-settings-portfolio-summary";
import { useSelectedWallet } from "@/hooks/wallets/use-selected-wallet";
import type {
  SettingsPortfolioRange,
  SettingsPortfolioWalletFilter,
} from "@/lib/portfolio/settings-summary";
import { CdpOfframpModal } from "@/components/wallets/cdp/cdp-offramp-modal";
import { CdpOnrampModal } from "@/components/wallets/cdp/cdp-onramp-modal";
import { CdpReceiveModal } from "@/components/wallets/cdp/cdp-receive-modal";
import { CdpSendModal } from "@/components/wallets/cdp/cdp-send-modal";
import { cn } from "@/lib/utils";

const DEFAULT_PORTFOLIO_RANGE: SettingsPortfolioRange = "month";

const PORTFOLIO_ACTIONS: readonly SettingsPortfolioActionKey[] = [
  "send",
  "receive",
  "bridge",
  "stake",
  "fund",
  "cash-out",
] as const;

type ActivePointState = Record<string, number | null>;

function createInitialActivePoints(
  assets: Array<{ id: string }> = [],
): ActivePointState {
  return Object.fromEntries(assets.map((asset) => [asset.id, null]));
}

function formatCurrency(value: number, locale: string) {
  return value.toLocaleString(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTotalPercentBadge(value: number | null | undefined) {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return `${safeValue.toFixed(2)}%`;
}

function resolveTotalDeltaClass(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value < 0
    ? "border-destructive/20 bg-destructive/10 text-destructive"
    : "border-primary/20 bg-primary/10 text-primary";
}

function formatPortfolioActionLabel(action: SettingsPortfolioActionKey) {
  switch (action) {
    case "cash-out":
      return "Cash out";
    default:
      return action.charAt(0).toUpperCase() + action.slice(1);
  }
}

function SettingsPortfolioActionButtons({
  onActionClick,
}: {
  onActionClick: (action: SettingsPortfolioActionKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PORTFOLIO_ACTIONS.map((action) => (
        <Button
          key={action}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onActionClick(action)}
          className="rounded-xl"
        >
          {formatPortfolioActionLabel(action)}
        </Button>
      ))}
    </div>
  );
}

function SettingsPortfolioCardSkeleton() {
  return (
    <SettingsPanel
      title="Portfolio Allocation"
      description="Loading embedded wallet balances and tracked asset performance."
      contentClassName="space-y-6"
    >
      <div className="animate-pulse space-y-6">
        <div className="space-y-3">
          <div className="h-4 w-36 rounded-md bg-muted" />
          <div className="h-10 w-56 rounded-md bg-muted" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-44 rounded-xl border border-border/70 bg-muted/40"
            />
          ))}
        </div>
      </div>
    </SettingsPanel>
  );
}

type SettingsPortfolioAllocationCardProps = {
  embeddedWallets?: OverviewEmbeddedWallet[];
  walletScope?: SettingsPortfolioWalletFilter;
  onWalletScopeChange?: (walletScope: SettingsPortfolioWalletFilter) => void;
};

export function SettingsPortfolioAllocationCard({
  embeddedWallets = [],
  walletScope: controlledWalletScope,
  onWalletScopeChange,
}: SettingsPortfolioAllocationCardProps = {}) {
  const router = useRouter();
  const { setSelectedWallet } = useSelectedWallet();
  const [activePoints, setActivePoints] = useState<ActivePointState>(createInitialActivePoints);
  const [internalWalletScope, setInternalWalletScope] =
    useState<SettingsPortfolioWalletFilter>(ALL_WALLETS_SCOPE);
  const [activeAction, setActiveAction] = useState<SettingsPortfolioActionKey | null>(null);
  const [actionChooserOpen, setActionChooserOpen] = useState(false);
  const [actionWallet, setActionWallet] = useState<OverviewEmbeddedWallet | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const reducedMotion = Boolean(useReducedMotion());
  const activeWalletScope = controlledWalletScope ?? internalWalletScope;
  const summaryQuery = useSettingsPortfolioSummary(DEFAULT_PORTFOLIO_RANGE, activeWalletScope);
  const locale = useLocale();
  const t = useTranslations("app");

  const trackedAssets = useMemo(
    () => summaryQuery.data?.trackedAssets ?? [],
    [summaryQuery.data?.trackedAssets],
  );
  const initialActivePoints = useMemo(
    () => createInitialActivePoints(trackedAssets),
    [trackedAssets],
  );
  const activeScopedWallet = useMemo(
    () => findOverviewEmbeddedWallet(embeddedWallets, activeWalletScope),
    [embeddedWallets, activeWalletScope],
  );
  const modalWallet = actionWallet ?? activeScopedWallet ?? embeddedWallets[0] ?? null;
  const showInlineActions = embeddedWallets.length > 0;

  const setWalletScope = (nextWalletScope: SettingsPortfolioWalletFilter) => {
    if (controlledWalletScope === undefined) {
      setInternalWalletScope(nextWalletScope);
    }

    onWalletScopeChange?.(nextWalletScope);

    const nextWallet = findOverviewEmbeddedWallet(embeddedWallets, nextWalletScope);
    if (nextWallet) {
      setSelectedWallet(nextWallet.selection);
    }
  };

  useEffect(() => {
    setActivePoints(initialActivePoints);
  }, [initialActivePoints]);

  useEffect(() => {
    if (activeWalletScope === ALL_WALLETS_SCOPE) {
      return;
    }

    if (findOverviewEmbeddedWallet(embeddedWallets, activeWalletScope)) {
      return;
    }

    if (controlledWalletScope === undefined) {
      setInternalWalletScope(ALL_WALLETS_SCOPE);
    }
    onWalletScopeChange?.(ALL_WALLETS_SCOPE);
  }, [activeWalletScope, controlledWalletScope, embeddedWallets, onWalletScopeChange]);

  if (summaryQuery.isLoading) {
    return <SettingsPortfolioCardSkeleton />;
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <SettingsPanel
        title={t("portfolioCard.allocationLabel")}
        description={t("portfolioCard.unavailableDescription")}
      >
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {summaryQuery.error instanceof Error
            ? summaryQuery.error.message
            : t("portfolioCard.unavailableDescription")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void summaryQuery.refetch()}
            className="rounded-xl"
          >
            <RefreshCcw className="size-4" />
            {t("portfolioCard.retry")}
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl">
            <Link href="/settings/wallets">
              {t("portfolioCard.walletControls")}
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </div>
      </SettingsPanel>
    );
  }

  const handleActionClick = (action: SettingsPortfolioActionKey) => {
    setActiveAction(action);
    setActionChooserOpen(true);
  };

  const handleActionWalletSelect = (wallet: OverviewEmbeddedWallet) => {
    setActionWallet(wallet);
    setSelectedWallet(wallet.selection);
    setActionChooserOpen(false);

    switch (activeAction) {
      case "send":
        setSendOpen(true);
        return;
      case "receive":
        setReceiveOpen(true);
        return;
      case "fund":
        setFundOpen(true);
        return;
      case "cash-out":
        setCashOutOpen(true);
        return;
      case "bridge":
        router.push("/defi/swap");
        return;
      case "stake":
        router.push("/settings/wallets#cdp-staking-section");
        return;
      default:
        return;
    }
  };

  const footerMessage =
    summaryQuery.data.emptyReason === "no-holdings"
      ? null
      : summaryQuery.data.message ?? null;
  const totalDeltaClass = resolveTotalDeltaClass(summaryQuery.data.totalDeltaPct);

  return (
    <>
      <div data-testid="settings-portfolio-card">
        <SettingsPanel
          title={t("portfolioCard.allocationLabel")}
          description={summaryQuery.data.subtitle}
          action={
            embeddedWallets.length > 0 ? (
              <SettingsPortfolioWalletSelector
                wallets={embeddedWallets}
                walletScope={activeWalletScope}
                onWalletScopeChange={setWalletScope}
              />
            ) : null
          }
          contentClassName="space-y-6"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("portfolioCard.totalNetWorth")}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {formatCurrency(summaryQuery.data.totalPortfolioUsd, locale)}
                </p>
                <Badge variant="outline" className={cn("rounded-lg px-2.5 py-1", totalDeltaClass)}>
                  {formatTotalPercentBadge(summaryQuery.data.totalDeltaPct)}
                </Badge>
              </div>
            </div>
          </div>

          {trackedAssets.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {trackedAssets.map((asset) => (
                <SettingsPortfolioAssetCard
                  key={asset.id}
                  asset={asset}
                  locale={locale}
                  activeIndex={activePoints[asset.id] ?? null}
                  reducedMotion={reducedMotion}
                  onPointEnter={(index) => {
                    setActivePoints((current) => ({
                      ...current,
                      [asset.id]: index,
                    }));
                  }}
                  onPointLeave={() => {
                    setActivePoints((current) => ({
                      ...current,
                      [asset.id]: null,
                    }));
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
              {summaryQuery.data.message ?? t("portfolioCard.unavailableDescription")}
            </div>
          )}

          {footerMessage || summaryQuery.data.emptyReason || showInlineActions ? (
            <div className="flex flex-col gap-3 border-t border-border/70 pt-4">
              {footerMessage ? (
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {footerMessage}
                </p>
              ) : null}

              {showInlineActions ? (
                <SettingsPortfolioActionButtons onActionClick={handleActionClick} />
              ) : (
                <Button asChild variant="outline" size="sm" className="w-fit rounded-xl">
                  <Link href="/settings/wallets">
                    {t("portfolioCard.walletControls")}
                    <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
              )}
            </div>
          ) : null}
        </SettingsPanel>
      </div>

      <SettingsPortfolioActionChooser
        open={actionChooserOpen}
        onOpenChange={setActionChooserOpen}
        action={activeAction}
        wallets={embeddedWallets}
        activeWalletSource={activeWalletScope === ALL_WALLETS_SCOPE ? null : activeWalletScope}
        onSelectWallet={handleActionWalletSelect}
      />

      {modalWallet ? (
        <>
          <CdpSendModal
            open={sendOpen}
            onOpenChange={setSendOpen}
            fromAddress={modalWallet.address}
            platform={modalWallet.platform}
            chainId={modalWallet.platform === "evm" ? (modalWallet.chainId ?? undefined) : undefined}
          />
          <CdpReceiveModal
            open={receiveOpen}
            onOpenChange={setReceiveOpen}
            address={modalWallet.address}
            chain={modalWallet.platform}
          />
          <CdpOnrampModal
            open={fundOpen}
            onOpenChange={setFundOpen}
            address={modalWallet.address}
            chainId={modalWallet.platform === "evm" ? (modalWallet.chainId ?? undefined) : undefined}
          />
          <CdpOfframpModal
            open={cashOutOpen}
            onOpenChange={setCashOutOpen}
            address={modalWallet.address}
            chainId={modalWallet.platform === "evm" ? (modalWallet.chainId ?? undefined) : undefined}
          />
        </>
      ) : null}
    </>
  );
}
