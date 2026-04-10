"use client";

import { useMemo } from "react";

import { useUserWallets } from "@/lib/hooks/wallets/profile/use-user-wallets";
import { resolveCdpEmbeddedEvmSelectionChainId } from "@/lib/cdp/cdp-wallet-selection";
import { useUnifiedWallets } from "@/hooks/wallets/use-unified-wallets";
import { useSelectedWallet } from "@/hooks/wallets/use-selected-wallet";

export function useChatWalletContext() {
  const wallets = useUnifiedWallets();
  const { selectedWallet } = useSelectedWallet();
  const { data: userWallets } = useUserWallets();

  const walletContext = useMemo(() => {
    const selectedEvmChainId =
      selectedWallet?.kind === "cdp_evm_smart"
        ? resolveCdpEmbeddedEvmSelectionChainId({
            address: selectedWallet.address,
            preferredChainId: selectedWallet.chainId,
            wallets: userWallets?.wallets,
          })
        : typeof selectedWallet?.chainId === "number" && Number.isFinite(selectedWallet.chainId)
          ? selectedWallet.chainId
          : wallets.evm?.chainId ?? null;
    const resolvedSelectedEvmChainId = selectedEvmChainId ?? wallets.evm?.chainId ?? null;

    const selectedEvm =
      selectedWallet?.platform === "evm" &&
      selectedWallet.address &&
      typeof resolvedSelectedEvmChainId === "number"
        ? {
            address: selectedWallet.address,
            chainId: resolvedSelectedEvmChainId,
            isConnected: true,
          }
        : null;

    const selectedSolana =
      selectedWallet?.platform === "solana" && selectedWallet.address
        ? {
            address: selectedWallet.address,
            isConnected: true,
          }
        : null;

    return {
      evm: selectedEvm ?? wallets.evm,
      solana: selectedSolana ?? wallets.solana,
      selected: selectedWallet
        ? {
            id: selectedWallet.id,
            kind: selectedWallet.kind,
            platform: selectedWallet.platform,
            address: selectedWallet.address,
            label: selectedWallet.label,
            chainId:
              typeof selectedWallet.chainId === "number" && Number.isFinite(selectedWallet.chainId)
                ? selectedWallet.chainId
                : null,
            source: selectedWallet.source,
            agentId: selectedWallet.agentId ?? null,
            agentName: selectedWallet.agentName ?? null,
          }
        : null,
    };
  }, [selectedWallet, userWallets?.wallets, wallets.evm, wallets.solana]);

  return {
    walletContext,
  };
}
