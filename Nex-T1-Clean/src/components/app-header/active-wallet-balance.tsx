"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

import { formatDisplayBalance } from "@/lib/cdp/cdp-balance-format";
import { resolveCdpEmbeddedEvmSelectionChainId } from "@/lib/cdp/cdp-wallet-selection";
import { useSidebarStore } from "@/stores/use-sidebar-store";
import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";
import { useCdpBalance } from "@/lib/hooks/cdp/use-cdp-balance";
import { useSelectedWallet } from "@/hooks/wallets/use-selected-wallet";
import { useUserWallets } from "@/lib/hooks/wallets/profile/use-user-wallets";

const ETH_ICON_SRC = "/assets/footer/eth.svg";
const SOLANA_ICON_SRC = "/assets/native-balance-logos/Solana.svg";

export function ActiveWalletBalance() {
  const selectedOverlayChain = useSidebarStore((state) => state.walletOverlayBalanceChain);
  const { selectedWallet } = useSelectedWallet();
  const { evmAddress, solanaAddress } = useResolvedCdpWallets();
  const { data: userWallets } = useUserWallets();

  const selectedEmbeddedPlatform = useMemo<"evm" | "solana" | null>(() => {
    if (selectedWallet?.kind === "cdp_evm_smart") return "evm";
    if (selectedWallet?.kind === "cdp_solana_embedded") return "solana";
    return null;
  }, [selectedWallet?.kind]);

  const activePlatform: "evm" | "solana" =
    selectedEmbeddedPlatform ??
    (selectedOverlayChain === "solana" && Boolean(solanaAddress) ? "solana" : "evm");
  const activeAddress = selectedEmbeddedPlatform
    ? (selectedWallet?.address ?? (activePlatform === "solana" ? solanaAddress : evmAddress))
    : activePlatform === "solana"
      ? solanaAddress
      : evmAddress;
  const activeEvmChainId = useMemo(() => {
    if (activePlatform !== "evm") {
      return undefined;
    }

    return resolveCdpEmbeddedEvmSelectionChainId({
      address: activeAddress ?? evmAddress,
      preferredChainId:
        selectedWallet?.kind === "cdp_evm_smart" ? selectedWallet.chainId : null,
      wallets: userWallets?.wallets,
    });
  }, [
    activeAddress,
    activePlatform,
    evmAddress,
    selectedWallet?.chainId,
    selectedWallet?.kind,
    userWallets?.wallets,
  ]);

  const { data: balance, isLoading } = useCdpBalance(
    activeAddress,
    activePlatform,
    activePlatform === "evm" ? activeEvmChainId : undefined,
  );

  const formattedBalance = useMemo(() => {
    if (!balance?.native?.balance) {
      return "--";
    }
    return formatDisplayBalance(
      balance?.native?.balance,
      balance?.native?.decimals ?? (activePlatform === "solana" ? 9 : 18),
    );
  }, [activePlatform, balance?.native?.balance, balance?.native?.decimals]);

  const symbol = balance?.native?.symbol ?? (activePlatform === "solana" ? "SOL" : "ETH");
  const iconSrc = activePlatform === "solana" ? SOLANA_ICON_SRC : ETH_ICON_SRC;

  return (
    <button
      data-testid="header-native-balance"
      onClick={() => useSidebarStore.getState().togglePanel("wallets")}
      className="flex h-8 items-center gap-2 rounded-md px-2 text-[var(--auth-nav-text)] transition-colors hover:bg-[var(--auth-sidebar-button-hover-bg)] hover:text-[var(--auth-nav-text-active)]"
    >
      {isLoading ? (
        <Loader2 className="size-3 animate-spin text-muted-foreground" />
      ) : (
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--auth-nav-text)]">
          <div className="relative size-3.5">
            <Image src={iconSrc} alt={symbol} fill className="object-contain" />
          </div>
          <span>{formattedBalance}</span>
          <span className="text-[var(--auth-text-muted)]">{symbol}</span>
        </div>
      )}
    </button>
  );
}
