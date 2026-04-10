"use client";

import Image from "next/image";
import { useMemo, type MouseEvent as ReactMouseEvent } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  EllipsisVertical,
  ExternalLink,
  EyeOff,
  KeyRound,
} from "lucide-react";

import { formatFiat, formatPercent } from "@/lib/formatters/wallet";
import type { WalletSnapshot } from "@/modules/wallets/profile";
import { cn } from "@/lib/utils";
import type { WalletViewType } from "../wallet-right-panel";
import { useTranslations } from "@/components/providers/locale-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getWalletSidebarCopy } from "@/modules/app/i18n";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";

import {
  resolveWalletChainContext,
  resolveWalletExplorerUrl,
  useWalletCarouselInsights,
} from "./use-wallet-carousel-insights";
import { resolveWalletIdentityLabel } from "./wallet-carousel-wallets";

type WalletCarouselCardProps = {
  wallet: WalletSnapshot;
  isActive: boolean;
  onSelect: () => void;
  onViewChange: (view: WalletViewType) => void;
  onRequestExport: (wallet: WalletSnapshot) => void;
  onHideWallet: (walletId: string) => void;
};

const WALLET_CHAIN_ICONS = {
  evm: LIQUID_GLASS_LOGOS.ethereum,
  solana: LIQUID_GLASS_LOGOS.solana,
} as const;

function formatWalletCardAddress(
  address: string,
  platform: "evm" | "solana",
  provisioningLabel: string,
): string {
  if (!address) return provisioningLabel;

  if (platform === "solana") {
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  }

  return `${address.slice(0, 6)}...${address.slice(-5)}`;
}

function stopCardEvent(event: ReactMouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function WalletQuickActionButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof ArrowUpRight;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="group flex h-9 items-center justify-center gap-1 rounded-[14px] border border-black/10 bg-black/[0.03] px-2.5 text-[10px] font-medium text-[#666666] transition-all duration-150 hover:border-black/20 hover:bg-black/[0.06] hover:text-[#171717] dark:border-white/8 dark:bg-white/[0.04] dark:text-white/75 dark:hover:border-white/15 dark:hover:bg-white/[0.08] dark:hover:text-white"
    >
      <Icon className="size-3.5 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

export function WalletCarouselCard({
  wallet,
  isActive,
  onSelect,
  onViewChange,
  onRequestExport,
  onHideWallet,
}: WalletCarouselCardProps) {
  const t = useTranslations("app");
  const copy = getWalletSidebarCopy(t).card;
  const insights = useWalletCarouselInsights(wallet);
  const chainContext = useMemo(() => resolveWalletChainContext(wallet), [wallet]);
  const explorerUrl = useMemo(() => resolveWalletExplorerUrl(wallet), [wallet]);
  const identityLabel = useMemo(
    () => resolveWalletIdentityLabel(wallet, copy.identity),
    [copy.identity, wallet],
  );

  const address = wallet.address?.trim() ?? "";
  const displayAddress = useMemo(
    () => formatWalletCardAddress(address, chainContext.platform, copy.provisioning),
    [address, chainContext.platform, copy.provisioning],
  );

  const walletEyebrow = wallet.customLabel?.trim() || wallet.label?.trim() || identityLabel;
  const walletChainLabel =
    chainContext.platform === "solana" ? copy.chain.solana : copy.chain.evm;
  const walletChainIcon = WALLET_CHAIN_ICONS[chainContext.platform];
  const canExport = wallet.provider === "cdp" && address.length > 0;

  const amountLabel = useMemo(() => {
    if (typeof insights.netWorthUsd === "number" && Number.isFinite(insights.netWorthUsd)) {
      return formatFiat(insights.netWorthUsd, { compact: false });
    }
    if (
      typeof wallet.totals.estimatedValueUsd === "number" &&
      Number.isFinite(wallet.totals.estimatedValueUsd)
    ) {
      return formatFiat(wallet.totals.estimatedValueUsd, { compact: false });
    }
    return "--";
  }, [insights.netWorthUsd, wallet.totals.estimatedValueUsd]);

  const changeLabel =
    typeof insights.change24hPercent === "number" && Number.isFinite(insights.change24hPercent)
      ? `24h ${insights.change24hPercent >= 0 ? "+" : ""}${formatPercent(insights.change24hPercent)}`
      : copy.changeSyncing;

  const changeToneClassName =
    typeof insights.change24hPercent === "number" && Number.isFinite(insights.change24hPercent)
      ? insights.change24hPercent >= 0
        ? "text-[#9fe870]"
        : "text-[#ff8e8e]"
      : "text-white/42";

  const handleQuickAction =
    (view: WalletViewType) =>
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      stopCardEvent(event);
      onSelect();
      onViewChange(view);
    };

  const openExplorer = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!explorerUrl) return;
    window.open(explorerUrl, "_blank", "noopener,noreferrer");
  };

  const requestExport = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canExport) return;
    onRequestExport(wallet);
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      data-testid="wallet-carousel-card"
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative h-[225px] w-[min(84vw,264px)] shrink-0 overflow-hidden rounded-[24px] border bg-transparent transition-all duration-150 sm:w-[264px]",
        isActive
          ? "border-black/10 bg-white/60 dark:border-white/8 dark:bg-[#c4c4c4]/5"
          : "border-black/8 bg-black/[0.02] hover:border-black/15 dark:border-white/5 dark:bg-transparent dark:hover:border-white/10",
      )}
    >
      <div className="relative flex h-full flex-col gap-3.5 p-4">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-[#666666] dark:text-[#c4c4c4]/80">
              {walletEyebrow}
            </p>
            <p
              data-testid="wallet-card-address"
              className="mt-1 truncate text-[14px] font-semibold tracking-[-0.03em] text-[#171717] dark:text-[#f4f4f4]"
              title={address || copy.provisioning}
            >
              {displayAddress}
            </p>
            <span data-testid="wallet-identity-label" className="sr-only">
              {identityLabel}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={copy.openWalletActions}
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/80 text-[#666666] transition-colors hover:border-black/15 hover:bg-white hover:text-[#171717] backdrop-blur-xl dark:border-white/8 dark:bg-[#121212]/60 dark:text-white/75 dark:hover:border-white/12 dark:hover:bg-[#121212]/75 dark:hover:text-white"
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <EllipsisVertical className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className="w-56 p-1.5"
            >
              <DropdownMenuItem onSelect={openExplorer} className="rounded-xl">
                <ExternalLink className="mr-2 size-4" />
                {copy.viewOnExplorer}
              </DropdownMenuItem>
              {canExport ? (
                <DropdownMenuItem onSelect={requestExport} className="rounded-xl">
                  <KeyRound className="mr-2 size-4" />
                  {copy.exportPrivateKey}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onHideWallet(wallet.id);
                }}
                className="rounded-xl"
              >
                <EyeOff className="mr-2 size-4" />
                {copy.hideWallet}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-auto">
          <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-[#666666] dark:text-[#c4c4c4]/80">
            {copy.walletNetWorth}
          </p>
          <p className="mt-1.5 truncate text-[28px] font-light leading-none tracking-[-0.06em] text-[#171717] dark:text-white">
            {amountLabel}
          </p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-1 dark:border-white/8 dark:bg-white/[0.04]">
              <div className="relative size-4 shrink-0 overflow-hidden rounded-full">
                <Image
                  src={walletChainIcon}
                  alt={walletChainLabel}
                  fill
                  sizes="16px"
                  className="object-contain"
                  unoptimized
                />
              </div>
              <span className="truncate text-[10px] font-medium text-[#666666] dark:text-white/70">
                {walletChainLabel}
              </span>
            </div>

            <span className={cn("text-[11px] font-medium tracking-[-0.01em]", changeToneClassName)}>
              {changeLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <WalletQuickActionButton
            label={copy.actions.send}
            icon={ArrowUpRight}
            onClick={handleQuickAction("send")}
          />
          <WalletQuickActionButton
            label={copy.actions.receive}
            icon={ArrowDownLeft}
            onClick={handleQuickAction("receive")}
          />
          <WalletQuickActionButton
            label={copy.actions.swap}
            icon={ArrowLeftRight}
            onClick={handleQuickAction("swap")}
          />
        </div>
      </div>
    </article>
  );
}
