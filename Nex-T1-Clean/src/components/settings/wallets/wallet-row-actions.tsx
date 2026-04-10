"use client";

import { ArrowDownToLine, ArrowUpFromLine, ExternalLink, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/settings/shared/settings-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { walletLedgerActionButtonClass, walletLedgerSecondaryButtonClass } from "@/lib/ui/wallet-ledger";

import type { WalletRow } from "./lib/wallet-table-types";
import { resolveExplorerAddressUrl } from "./lib/wallet-formatters";

interface WalletRowActionsProps {
  row: WalletRow;
  primaryAddress: string | null;
  canUseAddress: boolean;
  canActivate: boolean;
  onSendClick: () => void;
  onReceiveClick: () => void;
  onExportKeyClick: () => void;
  onActivateClick: () => void;
}

export function WalletRowActions({
  row,
  primaryAddress,
  canUseAddress,
  canActivate,
  onSendClick,
  onReceiveClick,
  onExportKeyClick,
  onActivateClick,
}: WalletRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      {canActivate && primaryAddress ? (
        <Button size="sm" variant="ghost" className={walletLedgerSecondaryButtonClass} onClick={onActivateClick}>
          Activate Wallet
        </Button>
      ) : null}

      <ActionTooltip label={canUseAddress ? "Send" : "Address pending"}>
        <Button size="icon" variant="ghost" className={walletLedgerActionButtonClass} onClick={onSendClick} disabled={!canUseAddress} aria-label="Send assets">
          <ArrowUpFromLine className="h-4 w-4" />
        </Button>
      </ActionTooltip>

      <ActionTooltip label={canUseAddress ? "Receive" : "Address pending"}>
        <Button size="icon" variant="ghost" className={walletLedgerActionButtonClass} onClick={onReceiveClick} disabled={!canUseAddress} aria-label="Receive assets">
          <ArrowDownToLine className="h-4 w-4" />
        </Button>
      </ActionTooltip>

      <ActionTooltip label={canUseAddress ? "Export Key" : "Address pending"}>
        <Button size="icon" variant="ghost" className={walletLedgerActionButtonClass} onClick={onExportKeyClick} disabled={!canUseAddress} aria-label="Export Private Key">
          <KeyRound className="h-4 w-4" />
        </Button>
      </ActionTooltip>

      {row.isSmartAccount && row.chainId && primaryAddress ? (
        <ActionTooltip label={canUseAddress ? "View on explorer" : "Address pending"}>
          <Button
            size="icon"
            variant="ghost"
            className={walletLedgerActionButtonClass}
            onClick={() => {
              if (!canUseAddress || !row.chainId) return;
              const href = resolveExplorerAddressUrl(row.chainId, primaryAddress);
              if (href) window.open(href, "_blank", "noopener,noreferrer");
            }}
            disabled={!canUseAddress}
            aria-label="View on explorer"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </ActionTooltip>
      ) : null}

      {row.isSmartAccount ? (
        <ActionTooltip label="Agent spend controls">
          <Button
            size="icon"
            variant="ghost"
            className={walletLedgerActionButtonClass}
            onClick={() => window.location.assign("/settings/agent-spend")}
            aria-label="Open agent spend controls"
          >
            <ShieldCheck className="h-4 w-4" />
          </Button>
        </ActionTooltip>
      ) : null}
    </div>
  );
}

function ActionTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}
