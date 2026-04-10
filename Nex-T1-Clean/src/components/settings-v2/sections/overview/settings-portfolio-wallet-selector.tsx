"use client";

import Image from "next/image";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ALL_WALLETS_SCOPE,
  SETTINGS_OVERVIEW_ALL_WALLET_ICONS,
  type OverviewEmbeddedWallet,
  findOverviewEmbeddedWallet,
  truncateOverviewWalletAddress,
} from "@/components/settings-v2/sections/overview/settings-overview-wallets";
import type { SettingsPortfolioWalletFilter } from "@/lib/portfolio/settings-summary";

function AllWalletIcons() {
  return (
    <div className="-space-x-1 flex items-center pr-1">
      {SETTINGS_OVERVIEW_ALL_WALLET_ICONS.slice(0, 4).map((icon) => (
        <span
          key={icon}
          className="relative inline-flex size-5 overflow-hidden rounded-full border border-background bg-muted"
        >
          <Image src={icon} alt="" fill className="object-cover" />
        </span>
      ))}
    </div>
  );
}

type SettingsPortfolioWalletSelectorProps = {
  wallets: OverviewEmbeddedWallet[];
  walletScope: SettingsPortfolioWalletFilter;
  onWalletScopeChange: (walletScope: SettingsPortfolioWalletFilter) => void;
};

export function SettingsPortfolioWalletSelector({
  wallets,
  walletScope,
  onWalletScopeChange,
}: SettingsPortfolioWalletSelectorProps) {
  const activeWallet = findOverviewEmbeddedWallet(wallets, walletScope);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 w-full justify-start gap-3 rounded-xl px-3 text-left sm:w-[240px]"
          aria-label="Select overview wallet"
        >
          {activeWallet ? (
            <Image
              src={activeWallet.chainIcon}
              alt={activeWallet.label}
              width={20}
              height={20}
              className="size-5 rounded-full"
            />
          ) : (
            <AllWalletIcons />
          )}
          <span className="min-w-0 flex-1 truncate">
            {activeWallet ? truncateOverviewWalletAddress(activeWallet.address) : "All wallets"}
          </span>
          <ChevronDown className="size-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side="bottom" sideOffset={10} className="w-64 p-1">
        <DropdownMenuItem
          onSelect={() => onWalletScopeChange(ALL_WALLETS_SCOPE)}
          className="flex items-center gap-3 rounded-lg px-3 py-2"
        >
          <AllWalletIcons />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">All wallets</div>
          </div>
          {walletScope === ALL_WALLETS_SCOPE ? (
            <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          ) : null}
        </DropdownMenuItem>

        {wallets.map((wallet) => (
          <DropdownMenuItem
            key={wallet.walletSource}
            onSelect={() => onWalletScopeChange(wallet.walletSource)}
            className="flex items-center gap-3 rounded-lg px-3 py-2"
          >
            <Image
              src={wallet.chainIcon}
              alt={wallet.label}
              width={20}
              height={20}
              className="size-5 rounded-full"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{wallet.label}</div>
              <div className="font-mono text-xs">
                {truncateOverviewWalletAddress(wallet.address)}
              </div>
            </div>
            {walletScope === wallet.walletSource ? (
              <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
