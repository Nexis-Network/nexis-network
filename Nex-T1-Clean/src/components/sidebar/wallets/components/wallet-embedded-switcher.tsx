"use client";

import Image from "next/image";
import { ChevronDown } from "lucide-react";

import { useTranslations } from "@/components/providers/locale-provider";
import { WalletBlockie } from "@/components/ui/wallet-blockie";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { WalletSnapshot } from "@/modules/wallets/profile";
import { getWalletSidebarCopy } from "@/modules/app/i18n";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";

import { resolveWalletIdentityLabel } from "./wallet-carousel-wallets";
import { isCdpWalletSnapshot, resolveWalletAssetType } from "./wallet-runtime-context";

type WalletEmbeddedSwitcherProps = {
  activeWallet: WalletSnapshot | null;
  selectorWallets: WalletSnapshot[];
  onSelectWallet: (walletId: string) => void;
};

const EMBEDDED_CHAIN_ICONS = {
  evm: LIQUID_GLASS_LOGOS.ethereum,
  solana: LIQUID_GLASS_LOGOS.solana,
} as const;

function getWalletPlatform(wallet: WalletSnapshot): "evm" | "solana" {
  return resolveWalletAssetType(wallet);
}

function getWalletIcon(wallet: WalletSnapshot): string {
  return EMBEDDED_CHAIN_ICONS[getWalletPlatform(wallet)];
}

function isEoaWallet(wallet: WalletSnapshot): boolean {
  const accountType =
    typeof wallet.metadata?.accountType === "string"
      ? wallet.metadata.accountType.toLowerCase()
      : "";

  return (
    !isCdpWalletSnapshot(wallet) &&
    (wallet.type === "external_evm" ||
      wallet.type === "external_connected" ||
      accountType === "eoa" ||
      wallet.metadata?.connected === true)
  );
}

function getWalletMenuLabel(
  wallet: WalletSnapshot,
  sidebarCopy: ReturnType<typeof getWalletSidebarCopy>,
): string {
  if (isEoaWallet(wallet)) {
    return resolveWalletIdentityLabel(wallet, sidebarCopy.card.identity);
  }

  return getWalletPlatform(wallet) === "solana"
    ? sidebarCopy.embeddedSwitcher.embeddedSolanaWallet
    : sidebarCopy.embeddedSwitcher.embeddedEvmWallet;
}

function truncateWalletAddress(
  address: string | null | undefined,
  platform: "evm" | "solana",
  copy: ReturnType<typeof getWalletSidebarCopy>["embeddedSwitcher"],
): string {
  if (!address) return platform === "solana" ? copy.solanaWallet : copy.evmWallet;

  return platform === "solana"
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getWalletTriggerLabel(
  wallet: WalletSnapshot | null,
  copy: ReturnType<typeof getWalletSidebarCopy>["embeddedSwitcher"],
): string {
  if (!wallet) return copy.embeddedWallets;

  const platform = getWalletPlatform(wallet);
  return truncateWalletAddress(wallet.address, platform, copy);
}

export function WalletEmbeddedSwitcher({
  activeWallet,
  selectorWallets,
  onSelectWallet,
}: WalletEmbeddedSwitcherProps) {
  const t = useTranslations("app");
  const sidebarCopy = getWalletSidebarCopy(t);
  const copy = sidebarCopy.embeddedSwitcher;
  const selectedWallet =
    selectorWallets.find((wallet) => wallet.id === activeWallet?.id) ?? null;
  const triggerWallet = selectedWallet ?? selectorWallets[0] ?? activeWallet ?? null;
  const menuWallets = selectorWallets.length > 0 ? selectorWallets : triggerWallet ? [triggerWallet] : [];
  const stackedIcons = menuWallets.slice(0, 3);

  if (!triggerWallet) {
    return null;
  }

  return (
    <div className="pb-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={copy.selectWallet}
            className="group inline-flex min-h-[32px] max-w-full items-center gap-2.5 rounded-full border border-[#EBEBEB] bg-white/70 px-[10px] py-[7px] text-left text-[#666666] shadow-[0_14px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-colors duration-150 hover:border-black/10 hover:bg-white hover:text-[#171717] dark:border-white/8 dark:bg-[#121212]/60 dark:text-white/75 dark:hover:border-white/12 dark:hover:bg-[#121212]/75 dark:hover:text-white"
          >
            <div className="flex shrink-0 items-center -space-x-2.5">
              {stackedIcons.map((wallet, index) => (
                <div
                  key={`${wallet.id}-${index}`}
                  className="relative size-[26px] overflow-hidden rounded-full border border-black/10 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#151519] dark:shadow-[0_8px_18px_rgba(0,0,0,0.2)]"
                >
                  {isEoaWallet(wallet) && wallet.address ? (
                    <WalletBlockie
                      address={wallet.address}
                      size={6}
                      scale={4}
                      className="h-full w-full rounded-full"
                    />
                  ) : (
                    <Image
                      src={getWalletIcon(wallet)}
                      alt={getWalletMenuLabel(wallet, sidebarCopy)}
                      fill
                      sizes="26px"
                      className="object-contain p-[2px]"
                      unoptimized
                    />
                  )}
                </div>
              ))}
            </div>

            <span className="min-w-0 truncate text-[12px] font-semibold tracking-[-0.02em]">
              {getWalletTriggerLabel(triggerWallet, copy)}
            </span>

            <ChevronDown className="size-3.5 shrink-0 text-[#666666] transition-transform duration-150 group-data-[state=open]:rotate-180 dark:text-white/75" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          side="bottom"
          sideOffset={8}
          className="w-[272px] p-1.5"
        >
          {menuWallets.map((wallet) => {
            const platform = getWalletPlatform(wallet);
            const isSelected = wallet.id === triggerWallet.id;

            return (
              <DropdownMenuItem
                key={wallet.id}
                onSelect={() => onSelectWallet(wallet.id)}
                className="flex items-center gap-3 rounded-xl px-3 py-2 outline-none transition-colors"
              >
                <div className="relative size-8 shrink-0 overflow-hidden rounded-full border border-black/10 bg-white/80 backdrop-blur-md dark:border-white/8 dark:bg-[#0f0f10]/60">
                  {isEoaWallet(wallet) && wallet.address ? (
                    <WalletBlockie
                      address={wallet.address}
                      size={6}
                      scale={4}
                      className="h-full w-full rounded-full"
                    />
                  ) : (
                    <Image
                      src={getWalletIcon(wallet)}
                      alt={getWalletMenuLabel(wallet, sidebarCopy)}
                      fill
                      sizes="32px"
                      className="object-contain p-[3px]"
                      unoptimized
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold tracking-[-0.02em]">
                    {truncateWalletAddress(wallet.address, platform, copy)}
                  </div>
                  <div className="truncate text-[10px] opacity-75">
                    {getWalletMenuLabel(wallet, sidebarCopy)}
                  </div>
                </div>

                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 rounded-full bg-[#0088ff] transition-opacity",
                    isSelected ? "opacity-100" : "opacity-0",
                  )}
                />
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
