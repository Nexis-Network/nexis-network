"use client";

import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import Image from "next/image";
import {
  EllipsisVertical,
  ExternalLink,
  EyeOff,
  KeyRound,
  QrCode,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/components/providers/locale-provider";
import { getWalletSidebarCopy } from "@/modules/app/i18n";

type WalletCardActionStripProps = {
  chainIcon: string;
  chainLabel: string;
  canExport: boolean;
  onOpenReceive: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onRequestExport: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onOpenExplorer: (event: Event) => void;
  onHideWallet: (event: Event) => void;
};

function WalletActionButton({
  label,
  onClick,
  disabled,
  children,
  dataTestId,
}: {
  label: string;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  children: ReactNode;
  dataTestId?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-testid={dataTestId}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/78 transition hover:border-white/25 hover:bg-white/[0.1] hover:text-white",
        disabled && "cursor-not-allowed opacity-45 hover:border-white/10 hover:bg-white/[0.05] hover:text-white/78",
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function WalletCardActionStrip({
  chainIcon,
  chainLabel,
  canExport,
  onOpenReceive,
  onRequestExport,
  onOpenExplorer,
  onHideWallet,
}: WalletCardActionStripProps) {
  const t = useTranslations("app");
  const copy = getWalletSidebarCopy(t).card;
  return (
    <div className="flex flex-col items-end gap-1">
      <div
        data-testid="wallet-card-chain-badge"
        className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5"
      >
        <div className="relative h-4 w-4 overflow-hidden rounded-full">
          <Image
            src={chainIcon}
            alt={chainLabel}
            fill
            className="object-cover"
            sizes="16px"
            unoptimized
          />
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/70">
          {chainLabel}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <WalletActionButton
          label={copy.receiveWalletAssets}
          onClick={onOpenReceive}
          dataTestId="wallet-card-receive-trigger"
        >
          <QrCode className="h-3 w-3" />
        </WalletActionButton>

        <WalletActionButton
          label={copy.exportPrivateKey}
          onClick={onRequestExport}
          disabled={!canExport}
          dataTestId="wallet-card-export-trigger"
        >
          <KeyRound className="h-3 w-3" />
        </WalletActionButton>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={copy.openWalletActions}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/8 bg-[#121212]/60 text-white/75 transition hover:border-white/12 hover:bg-[#121212]/75 hover:text-white backdrop-blur-xl"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <EllipsisVertical className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52"
          >
            <DropdownMenuItem onSelect={onOpenExplorer}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {copy.viewOnExplorer}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={onHideWallet}
              className="text-rose-300 focus:text-rose-200"
            >
              <EyeOff className="mr-2 h-4 w-4" />
              {copy.hideWallet}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
