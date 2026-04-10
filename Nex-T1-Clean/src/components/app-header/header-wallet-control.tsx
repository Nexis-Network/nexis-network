"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, Wallet } from "lucide-react";
import { useConnectEoaWallet } from "@/lib/hooks/wallet/use-connect-eoa-wallet";
import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConnectWalletModal } from "@/components/wallets/connect-wallet-modal";
import { getSupportedChains } from "@/lib/chains";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";

const DEFAULT_CHAIN_ICON = LIQUID_GLASS_LOGOS.ethereum;
const MSG_CHAIN_ICONS: Record<number, string> = {
  1: LIQUID_GLASS_LOGOS.ethereum,
  10: "/assets/chain-icons/optimism.svg",
  56: LIQUID_GLASS_LOGOS.bnb,
  97: LIQUID_GLASS_LOGOS.bnb,
  122: "/icons/chain-icons/fuse.svg",
  130: "/assets/chain-icons/unichain.svg",
  137: "/assets/chain-icons/polygon.svg",
  143: "/assets/chain-icons/monad.svg",
  204: "/icons/chain-icons/opbnb.svg",
  324: "/icons/chain-icons/zksync.svg",
  480: "/icons/chain-icons/worldchain.svg",
  998: LIQUID_GLASS_LOGOS.hyperliquid,
  999: LIQUID_GLASS_LOGOS.hyperliquid,
  1101: "/icons/chain-icons/zksync.svg",
  8453: "/assets/chain-icons/base.svg",
  43113: "/assets/chain-icons/avalanche.svg",
  43114: "/assets/chain-icons/avalanche.svg",
  42161: "/assets/chain-icons/arbitrum.svg",
  42220: "/assets/chain-icons/celo.svg",
  4801: "/icons/chain-icons/worldchain.svg",
  50104: "/assets/chain-icons/sophon.svg",
  59144: "/assets/chain-icons/linea.svg",
  80094: "/icons/chain-icons/bera.svg",
  33139: "/icons/chain-icons/ape.svg",
  84532: "/assets/chain-icons/base.svg",
  81457: "/assets/chain-icons/blast.svg",
  900001: LIQUID_GLASS_LOGOS.solana,
  900002: LIQUID_GLASS_LOGOS.solana,
  11155111: LIQUID_GLASS_LOGOS.ethereum,
  11155420: "/assets/chain-icons/optimism.svg",
  421614: "/assets/chain-icons/arbitrum.svg",
  7777777: "/icons/chain-icons/zora.svg",
};

export function getChainIcon(chainId?: number): string {
  if (!chainId) return DEFAULT_CHAIN_ICON;
  return MSG_CHAIN_ICONS[chainId] ?? DEFAULT_CHAIN_ICON;
}

/**
 * Left-side control: Connect Button OR Chain Selector
 *
 * When Nex Wallets are active, shows the CDP EVM address as
 * the primary indicator. External wallet connection remains available
 * alongside via the chain selector.
 */
export function HeaderWalletControl() {
  const { isConnected, isEvmConnected, chainId, switchChain } = useConnectEoaWallet();
  const cdp = useResolvedCdpWallets();
  const [modalOpen, setModalOpen] = useState(false);
  const supportedChains = useMemo(() => getSupportedChains(), []);

  // Nex Wallet address chip (shown when CDP is signed in)
  const cdpChip = cdp.isSignedIn && cdp.evmAddress ? (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 text-xs text-emerald-400">
      <span className="size-1.5 rounded-full bg-emerald-400" />
      {cdp.evmAddress.slice(0, 6)}...{cdp.evmAddress.slice(-4)}
    </span>
  ) : null;

  if (!isConnected || !isEvmConnected) {
    return (
      <>
        {cdpChip}
        <Button
          data-testid="header-wallet-control"
          onClick={() => setModalOpen(true)}
          variant="outline"
          size="sm"
          className="h-8 gap-2 rounded-xl border border-[var(--auth-menu-subtle-border)] bg-[var(--auth-menu-subtle-bg)] px-2 text-xs text-[var(--auth-menu-fg)]/75 transition-colors hover:bg-[var(--auth-menu-hover-bg)] hover:text-[var(--auth-menu-fg)]"
        >
          <Wallet className="size-3.5" />
          Connect Wallet
        </Button>
        <ConnectWalletModal open={modalOpen} onOpenChange={setModalOpen} />
      </>
    );
  }

  // If connected, show chain selector (plus CDP address chip if available)
  return (
    <div className="flex items-center gap-1.5">
      {cdpChip}
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-testid="header-wallet-control"
          variant="ghost"
          size="sm"
          className="mr-1 h-8 gap-2 rounded-xl border border-[var(--auth-menu-subtle-border)] bg-[var(--auth-menu-subtle-bg)] px-2 text-xs text-[var(--auth-menu-fg)]/75 transition-colors hover:bg-[var(--auth-menu-hover-bg)] hover:text-[var(--auth-menu-fg)]"
        >
          <div className="relative size-4">
            <Image
              src={getChainIcon(chainId)}
              alt="Chain"
              fill
              sizes="16px"
              className="object-contain"
            />
          </div>
          {/* Chain name removed as requested */}
          <ChevronDown className="size-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-[220px] overflow-y-auto p-2">
        {supportedChains.map((chain) => (
          <DropdownMenuItem
            key={chain.id}
            onClick={() => switchChain(chain.id)}
            className="cursor-pointer gap-3 rounded-xl py-2 text-xs"
          >
            <div className="relative size-4 shrink-0">
              <Image
                src={getChainIcon(chain.id)}
                alt={chain.name}
                fill
                sizes="16px"
                className="object-contain"
              />
            </div>
            {chain.name}
            {chain.id === chainId && <Check className="ml-auto size-3" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
}

// Removed unused HeaderWalletDetails and useConnectedWalletIcon placeholder
