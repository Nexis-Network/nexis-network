"use client";

import { ChevronDown } from "lucide-react";
import { CopyIcon } from "@/components/sidebar-03/animated-icons";
import { Fragment } from "react";

import { Button } from "@/components/settings/shared/settings-button";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserPresenceAvatar } from "@/components/ui/user-presence-avatar";
import { cn } from "@/lib/utils";
import {
  walletLedgerActionButtonClass,
  walletLedgerCellClass,
  walletLedgerCellLeadingClass,
  walletLedgerCellTrailingClass,
  walletLedgerExpandedCellClass,
  walletLedgerIconFrameClass,
  walletLedgerRowClass,
  walletLedgerSubLabelClass,
} from "@/lib/ui/wallet-ledger";
import WalletHoldingsDetails from "@/components/settings/wallets/wallet-holdings-details";
import { WalletTypeBadge } from "./wallet-type-badge";
import { Badge } from "@/components/ui/badge";
import {
  SettingsTableCell,
  SettingsTableRow,
} from "@/components/settings/shared/settings-table";

import type { WalletRow as WalletRowType } from "./lib/wallet-table-types";
import {
  formatCount,
  formatCurrency,
  formatSignedCurrency,
  getPercentDisplay,
  getPnlTone,
  truncateAddress,
  COLUMN_COUNT,
} from "./lib/wallet-formatters";
import { isAddressUsable } from "./lib/wallet-normalizers";
import { WalletRowActions } from "./wallet-row-actions";

interface WalletRowComponentProps {
  row: WalletRowType;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onCopyAddress: (address: string | null) => void;
  onSendClick: (wallet: WalletRowType) => void;
  onReceiveClick: (wallet: WalletRowType) => void;
  onExportKeyClick: (wallet: WalletRowType) => void;
  onActivateClick: (chainId: number | null, address: string | null) => void;
}

export function WalletRowComponent({
  row,
  isExpanded,
  onToggleExpand,
  onCopyAddress,
  onSendClick,
  onReceiveClick,
  onExportKeyClick,
  onActivateClick,
}: WalletRowComponentProps) {
  const primaryAddress =
    row.smartAccountAddress ?? row.address ?? row.engineServerWalletAddress;
  const isAddressValid =
    typeof primaryAddress === "string" &&
    isAddressUsable(primaryAddress, row.platform);
  const isPending =
    row.isSmartAccount &&
    row.provisioningStatus &&
    row.provisioningStatus !== "ready";
  const canActivate =
    row.isSmartAccount &&
    isPending &&
    row.provisioningStatus !== "dead" &&
    isAddressValid &&
    typeof row.chainId === "number";
  const canUseAddress = isAddressValid && !isPending;
  const { tokens: tokenCount, nfts: nftCount } = row.holdingsCount;
  const tokenWorthText = formatCurrency(row.totals.tokenValueUsd);
  const nftWorthText = formatCurrency(row.totals.nftValueUsd);
  const { text: changeText, colorClass: changeColor } = getPercentDisplay(
    row.totals.change24hPercent,
  );
  const pnlTone = getPnlTone(row.totals.unrealizedPnlUsd);

  return (
    <Fragment>
      <SettingsTableRow className={cn(walletLedgerRowClass, "align-top")}>
        <SettingsTableCell
          className={cn(walletLedgerCellClass, walletLedgerCellLeadingClass)}
        >
          <div className="flex items-start gap-3">
            <ChainGroup row={row} />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-2 text-left text-sm font-medium text-[var(--settings-foreground-strong)]"
                  onClick={() => onToggleExpand(row.id)}
                  aria-expanded={isExpanded}
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                  {primaryAddress ? (
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <span className="mono-value text-xs md:text-sm">
                          {truncateAddress(primaryAddress)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6} align="start">
                        <span className="mono-value text-xs">
                          {primaryAddress}
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span>{row.label}</span>
                  )}
                </button>
                {primaryAddress ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className={cn(walletLedgerActionButtonClass, "h-8 w-8")}
                        onClick={() => onCopyAddress(primaryAddress)}
                        disabled={!canUseAddress}
                        aria-label={`Copy ${row.label} address`}
                      >
                        <CopyIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      {canUseAddress ? "Copy address" : "Address pending"}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
              <div className={walletLedgerSubLabelClass}>
                {row.label}
                {row.provider ? ` • ${row.provider}` : null}
              </div>
            </div>
          </div>
        </SettingsTableCell>
        <SettingsTableCell className={walletLedgerCellClass}>
          <div className="flex flex-col items-start gap-2">
            <WalletTypeBadge category={row.type} label={row.typeLabel} />
            {row.isSmartAccount &&
            row.provisioningStatus &&
            row.provisioningStatus !== "provisioned" ? (
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-wide"
              >
                {row.provisioningStatus}
              </Badge>
            ) : null}
            {row.isSmartAccount &&
            row.provisioningStatus === "dead" &&
            row.lastError ? (
              <span
                className="max-w-[180px] text-[11px] text-destructive line-clamp-2"
                title={row.lastError}
              >
                {row.lastError}
              </span>
            ) : null}
          </div>
        </SettingsTableCell>
        <SettingsTableCell className={cn(walletLedgerCellClass, "text-right")}>
          <span className={`mono-value text-sm font-medium ${changeColor}`}>
            {changeText}
          </span>
        </SettingsTableCell>
        <SettingsTableCell className={cn(walletLedgerCellClass, "text-right")}>
          <span className={`mono-value text-sm ${pnlTone}`}>
            {formatSignedCurrency(row.totals.unrealizedPnlUsd)}
          </span>
        </SettingsTableCell>
        <SettingsTableCell className={cn(walletLedgerCellClass, "text-right")}>
          <div className="mono-value text-sm font-medium text-[var(--settings-foreground-strong)]">
            {tokenWorthText}
          </div>
          {tokenCount !== null ? (
            <div className={walletLedgerSubLabelClass}>
              <span className="mono-value">{formatCount(tokenCount)}</span>{" "}
              assets
            </div>
          ) : null}
        </SettingsTableCell>
        <SettingsTableCell className={cn(walletLedgerCellClass, "text-right")}>
          <div className="mono-value text-sm font-medium text-[var(--settings-foreground-strong)]">
            {nftWorthText}
          </div>
          {nftCount !== null ? (
            <div className={walletLedgerSubLabelClass}>
              <span className="mono-value">{formatCount(nftCount)}</span>{" "}
              collectibles
            </div>
          ) : null}
        </SettingsTableCell>
        <SettingsTableCell
          className={cn(
            walletLedgerCellClass,
            walletLedgerCellTrailingClass,
            "text-right",
          )}
        >
          <WalletRowActions
            row={row}
            primaryAddress={primaryAddress}
            canUseAddress={canUseAddress}
            canActivate={Boolean(canActivate)}
            onSendClick={() => onSendClick(row)}
            onReceiveClick={() => onReceiveClick(row)}
            onExportKeyClick={() => onExportKeyClick(row)}
            onActivateClick={() => onActivateClick(row.chainId, primaryAddress)}
          />
        </SettingsTableCell>
      </SettingsTableRow>
      {isExpanded ? (
        <SettingsTableRow className="border-0">
          <SettingsTableCell
            colSpan={COLUMN_COUNT}
            className={walletLedgerExpandedCellClass}
          >
            <div>
              <WalletHoldingsDetails
                address={row.smartAccountAddress ?? row.address}
                platform={row.platform}
                chainId={row.chainId}
              />
            </div>
          </SettingsTableCell>
        </SettingsTableRow>
      ) : null}
    </Fragment>
  );
}

function ChainGroup({ row }: { row: WalletRowType }) {
  const primary = row.chains.length
    ? row.chains.slice(0, 3)
    : row.walletIcon
      ? [{ name: row.label, icon: row.walletIcon }]
      : [];

  if (primary.length === 0) {
    return (
      <div
        className={cn(walletLedgerIconFrameClass, "h-11 w-11 rounded-[14px]")}
      >
        <UserPresenceAvatar icon={null} name={row.label} size={28} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          walletLedgerIconFrameClass,
          "h-11 min-w-11 rounded-[14px] justify-start px-1.5",
        )}
      >
        <div className="flex items-center -space-x-1.5">
          {primary.map((chain, index) => (
            <UserPresenceAvatar
              key={`${row.id}-chain-${index}`}
              icon={chain.icon}
              name={chain.name}
              size={26}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {row.chains.length > 3 ? (
          <span className="rounded-full border border-[var(--settings-border-soft)] bg-[var(--settings-elevated)]/70 px-2 text-[10px] font-medium text-[var(--settings-foreground-muted)]">
            +{row.chains.length - 3}
          </span>
        ) : null}
      </div>
      {Array.isArray(row.topAssets) && row.topAssets.length ? (
        <div className="ml-1 flex items-center gap-1">
          {row.topAssets.map((asset, idx) => (
            <UserPresenceAvatar
              key={`${row.id}-asset-${idx}`}
              icon={asset.icon || LIQUID_GLASS_LOGOS.solana}
              name={asset.symbol || "Asset"}
              size={18}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
