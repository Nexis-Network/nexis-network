import Image from "next/image";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getSettingsWalletSwitcherCopy } from "@/modules/settings/i18n";
import {
  type HeaderEmbeddedWallet,
  truncateWalletAddress,
} from "./settings-header-wallet-switcher.helpers";

type SettingsHeaderWalletSwitcherMenuProps = {
  activeWallet: HeaderEmbeddedWallet;
  embeddedWallets: HeaderEmbeddedWallet[];
  menuOpen: boolean;
  copy: ReturnType<typeof getSettingsWalletSwitcherCopy>;
  onMenuOpenChange: (open: boolean) => void;
  onSelectWallet: (wallet: HeaderEmbeddedWallet) => void;
};

export function SettingsHeaderWalletSwitcherMenu({
  activeWallet,
  embeddedWallets,
  menuOpen,
  copy,
  onMenuOpenChange,
  onSelectWallet,
}: SettingsHeaderWalletSwitcherMenuProps) {
  return (
    <DropdownMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={copy.selectWallet}
          className="h-8 min-w-[164px] justify-start gap-2 rounded-full px-2.5"
        >
          <Image
            src={activeWallet.chainIcon}
            alt={copy.chainAlt(activeWallet.label)}
            width={16}
            height={16}
            className="size-4 rounded-full"
          />
          <span className="truncate text-sm font-medium">
            {truncateWalletAddress(activeWallet.address)}
          </span>
          <ChevronDown
            className={cn(
              "ml-auto size-4 transition-transform duration-200",
              menuOpen && "rotate-180",
            )}
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="bottom" sideOffset={10} className="w-72 p-1">
        {embeddedWallets.map((wallet) => (
          <DropdownMenuItem
            key={wallet.id}
            onSelect={() => onSelectWallet(wallet)}
            className="flex items-center gap-3 rounded-lg px-3 py-2"
          >
            <Image
              src={wallet.chainIcon}
              alt={copy.chainAlt(wallet.label)}
              width={18}
              height={18}
              className="size-[18px] rounded-full"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                {wallet.label}
              </div>
              <div className="truncate font-mono text-xs text-muted-foreground">
                {truncateWalletAddress(wallet.address)}
              </div>
            </div>
            {isSelectedWallet(wallet, activeWallet.address) ? (
              <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function isSelectedWallet(
  wallet: HeaderEmbeddedWallet,
  activeAddress: string,
): boolean {
  return wallet.address.toLowerCase() === activeAddress.toLowerCase();
}
