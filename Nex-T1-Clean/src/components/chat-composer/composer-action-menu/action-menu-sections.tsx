"use client";

import {
  forwardRef,
  memo,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { IconPlus } from "@tabler/icons-react";

import {
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { DynamicAvatar } from "@/components/ui/dynamic-avatar";
import { getChainIcon } from "@/components/app-header/header-wallet-control";
import { cn } from "@/lib/utils";
import {
  COMPOSER_ICON_BUTTON_CLASS,
  COMPOSER_ICON_CLASS,
  COMPOSER_ICON_BUTTON_COMPACT_CLASS,
  COMPOSER_ICON_COMPACT_CLASS,
  COMPOSER_MENU_ITEM_CLASS,
  COMPOSER_MENU_SEPARATOR_CLASS,
  COMPOSER_MENU_SUBCONTENT_CLASS,
} from "@/components/chat-composer/composer-theme";

import type {
  ComposerActionMenuTriggerVariant,
  ComposerChainOption,
  WalletOption,
} from "./action-menu-types";
import { walletKindLabelMap } from "./action-menu-types";

type ActionMenuTriggerProps = {
  triggerVariant?: ComposerActionMenuTriggerVariant;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const ActionMenuTriggerBase = forwardRef<
  HTMLButtonElement,
  ActionMenuTriggerProps
>(function ActionMenuTrigger(
  {
    className,
    triggerVariant = "default",
    type = "button",
    "aria-label": ariaLabel = "Composer actions",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        triggerVariant === "compact"
          ? COMPOSER_ICON_BUTTON_COMPACT_CLASS
          : triggerVariant === "nexInstant"
            ? COMPOSER_ICON_BUTTON_CLASS
            : COMPOSER_ICON_BUTTON_CLASS,
        className,
      )}
      aria-label={ariaLabel}
      {...props}
    >
      <IconPlus
        className={
          triggerVariant === "compact"
            ? COMPOSER_ICON_COMPACT_CLASS
            : COMPOSER_ICON_CLASS
        }
      />
    </button>
  );
});

ActionMenuTriggerBase.displayName = "ActionMenuTrigger";

export const ActionMenuTrigger = memo(ActionMenuTriggerBase);

type WalletSelectorSubmenuProps = {
  activeWallet: WalletOption | null;
  availableWallets: WalletOption[];
  selectedWalletId?: string | null;
  selectedWalletAddress?: string | null;
  onWalletSelect: (wallet: WalletOption | null) => void;
};

export const WalletSelectorSubmenu = memo(function WalletSelectorSubmenu({
  activeWallet,
  availableWallets,
  selectedWalletId,
  selectedWalletAddress,
  onWalletSelect,
}: WalletSelectorSubmenuProps) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          {activeWallet ? (
            <>
              <DynamicAvatar
                address={activeWallet.avatarSeed}
                size={16}
                className="size-4"
              />
              <span className="max-w-[120px] truncate font-mono">
                {activeWallet.address.slice(0, 6)}...
                {activeWallet.address.slice(-4)}
              </span>
            </>
          ) : (
            <span>Select Wallet</span>
          )}
        </div>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent
          className={cn(COMPOSER_MENU_SUBCONTENT_CLASS, "w-64")}
        >
          <div className="px-2 text-xs font-medium">Available Wallets</div>
          <DropdownMenuSeparator className={COMPOSER_MENU_SEPARATOR_CLASS} />
          {availableWallets.length > 0 ? (
            availableWallets.map((wallet) => (
              <DropdownMenuItem
                key={wallet.id}
                onClick={() => onWalletSelect(wallet)}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <DynamicAvatar
                      address={wallet.avatarSeed}
                      size={14}
                      className="size-3.5"
                    />
                    <span>{wallet.label}</span>
                  </div>
                  <span className="ml-5 text-[10px]">
                    {walletKindLabelMap[wallet.kind]}
                  </span>
                  <span className="ml-5 font-mono text-[10px]">
                    {wallet.address.slice(0, 6)}...
                    {wallet.address.slice(-4)}
                  </span>
                </div>
                {selectedWalletId === wallet.id &&
                selectedWalletAddress === wallet.address ? (
                  <Check className="size-3 text-sky-500" />
                ) : null}
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-center text-xs">
              No wallets generated
            </div>
          )}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
});

type ChainSelectorSubmenuProps = {
  chainId?: number;
  selectedChain?: ComposerChainOption;
  visibleChains: ComposerChainOption[];
  showTestnets: boolean;
  useAllChains: boolean;
  onShowTestnetsChange: (checked: boolean) => void;
  onAllChainsSelect: () => void;
  onChainSelect: (chainId: number) => void;
};

export const ChainSelectorSubmenu = memo(function ChainSelectorSubmenu({
  chainId,
  selectedChain,
  visibleChains,
  showTestnets,
  useAllChains,
  onShowTestnetsChange,
  onAllChainsSelect,
  onChainSelect,
}: ChainSelectorSubmenuProps) {
  const showAllChains = useAllChains || !chainId;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          {showAllChains ? (
            <>
              <Image
                src="/assets/portfolio/all-networks.png"
                alt="All chains"
                width={16}
                height={16}
                className="size-4 rounded-full object-cover"
              />
              <span>All chains</span>
            </>
          ) : selectedChain ? (
            <>
              <Image
                src={getChainIcon(chainId)}
                alt="chain"
                width={16}
                height={16}
                className="size-4 rounded-full object-contain"
              />
              <span>{selectedChain.name}</span>
            </>
          ) : (
            <span>Select Chain</span>
          )}
        </div>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent
          className={cn(
            COMPOSER_MENU_SUBCONTENT_CLASS,
            "no-scrollbar max-h-[320px] w-56 overflow-y-auto",
          )}
        >
          <DropdownMenuItem
            onClick={onAllChainsSelect}
            className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs"
          >
            <div className="flex items-center gap-2">
              <Image
                src="/assets/portfolio/all-networks.png"
                alt="All chains"
                width={14}
                height={14}
                className="size-3.5 rounded-full object-cover"
              />
              <span>All chains</span>
            </div>
            {showAllChains ? <Check className="size-3 text-sky-500" /> : null}
          </DropdownMenuItem>

          <DropdownMenuSeparator className={COMPOSER_MENU_SEPARATOR_CLASS} />

          {visibleChains.map((chain) => (
            <DropdownMenuItem
              key={chain.id}
              onClick={() => onChainSelect(chain.id)}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs"
            >
              <div className="flex items-center gap-2">
                <Image
                  src={getChainIcon(chain.id)}
                  alt={chain.name}
                  width={14}
                  height={14}
                  className="size-3.5 rounded-full object-contain"
                />
                <span>{chain.name}</span>
                {chain.testnet ? (
                  <span className="rounded bg-muted px-1 py-0 text-[9px] uppercase tracking-wide">
                    Testnet
                  </span>
                ) : null}
              </div>
              {!useAllChains && chain.id === chainId ? (
                <Check className="size-3 text-sky-500" />
              ) : null}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className={COMPOSER_MENU_SEPARATOR_CLASS} />

          <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
            <div className="flex flex-col">
              <span className="text-xs font-medium">Show testnets</span>
              <span className="text-[10px]">
                Include testnet chains in this list
              </span>
            </div>
            <Switch
              checked={showTestnets}
              onCheckedChange={onShowTestnetsChange}
              size="xs"
              aria-label="Show testnet chains"
            />
          </div>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
});

type ActionMenuStatusRowProps = {
  icon: ReactNode;
  label: string;
  badgeLabel: string;
  onClick: () => void;
};

export const ActionMenuStatusRow = memo(function ActionMenuStatusRow({
  icon,
  label,
  badgeLabel,
  onClick,
}: ActionMenuStatusRowProps) {
  return (
    <DropdownMenuItem onClick={onClick} className={COMPOSER_MENU_ITEM_CLASS}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="flex items-center justify-center rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-500">
        {badgeLabel}
      </span>
    </DropdownMenuItem>
  );
});
