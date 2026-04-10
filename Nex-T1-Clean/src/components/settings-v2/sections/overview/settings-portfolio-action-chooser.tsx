"use client";

import Image from "next/image";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import type { OverviewEmbeddedWallet } from "./settings-overview-wallets";
import { truncateOverviewWalletAddress } from "./settings-overview-wallets";

export type SettingsPortfolioActionKey =
  | "send"
  | "receive"
  | "bridge"
  | "stake"
  | "fund"
  | "cash-out";

const ACTION_COPY: Record<
  SettingsPortfolioActionKey,
  { title: string; description: string }
> = {
  send: {
    title: "Choose a wallet to send from",
    description: "Select the embedded wallet that should handle this transfer.",
  },
  receive: {
    title: "Choose a wallet to receive into",
    description: "Select the embedded wallet address you want to share.",
  },
  bridge: {
    title: "Choose a wallet to bridge with",
    description: "Select which embedded wallet should open the bridge flow.",
  },
  stake: {
    title: "Choose a wallet to stake from",
    description: "Select the embedded wallet that should open staking controls.",
  },
  fund: {
    title: "Choose a wallet to fund",
    description: "Select the embedded wallet to open the fiat on-ramp flow.",
  },
  "cash-out": {
    title: "Choose a wallet to cash out from",
    description: "Select the embedded wallet that should open the offramp flow.",
  },
};

function getWalletActionSupport(
  action: SettingsPortfolioActionKey,
  wallet: OverviewEmbeddedWallet,
): { supported: boolean; reason: string | null } {
  if ((action === "fund" || action === "cash-out") && wallet.platform !== "evm") {
    return {
      supported: false,
      reason: "Currently available on the EVM embedded wallet only.",
    };
  }

  return {
    supported: true,
    reason: null,
  };
}

type SettingsPortfolioActionChooserProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: SettingsPortfolioActionKey | null;
  wallets: OverviewEmbeddedWallet[];
  activeWalletSource: OverviewEmbeddedWallet["walletSource"] | null;
  onSelectWallet: (wallet: OverviewEmbeddedWallet) => void;
};

export function SettingsPortfolioActionChooser({
  open,
  onOpenChange,
  action,
  wallets,
  activeWalletSource,
  onSelectWallet,
}: SettingsPortfolioActionChooserProps) {
  const copy = action ? ACTION_COPY[action] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy?.title ?? "Choose a wallet"}</DialogTitle>
          <DialogDescription>
            {copy?.description ?? "Select the embedded wallet to continue."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {wallets.map((wallet) => {
            const support = action
              ? getWalletActionSupport(action, wallet)
              : { supported: true, reason: null };
            const isActive = activeWalletSource === wallet.walletSource;

            return (
              <button
                key={wallet.walletSource}
                type="button"
                onClick={() => {
                  if (!support.supported) {
                    return;
                  }
                  onSelectWallet(wallet);
                }}
                disabled={!support.supported}
                className={cn(
                  "rounded-xl border border-border/70 bg-muted/20 p-4 text-left transition-colors",
                  support.supported
                    ? "hover:bg-muted/40"
                    : "cursor-not-allowed opacity-60",
                )}
                data-testid={`settings-portfolio-action-wallet-${wallet.platform}`}
              >
                <div className="flex items-start gap-3">
                  <Image
                    src={wallet.chainIcon}
                    alt={wallet.label}
                    width={22}
                    height={22}
                    className="mt-0.5 size-[22px] rounded-full"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{wallet.label}</span>
                      {isActive ? (
                        <span className="rounded-md border border-border/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {truncateOverviewWalletAddress(wallet.address)}
                    </p>
                    {!support.supported && support.reason ? (
                      <p className="mt-2 text-xs text-muted-foreground">{support.reason}</p>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
