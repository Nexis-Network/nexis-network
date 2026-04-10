"use client";

import { useCallback, useMemo } from "react";

import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";
import { useUserWallets } from "@/lib/hooks/wallets/profile/use-user-wallets";
import { useConnectEoaWallet } from "@/lib/hooks/wallet/use-connect-eoa-wallet";
import {
  useSelectedWallet,
  type SelectedWalletSelection,
} from "@/hooks/wallets/use-selected-wallet";
import {
  buildCdpEvmWalletSelection,
  buildCdpSolanaWalletSelection,
  buildEoaWalletSelection,
} from "@/hooks/wallets/use-selected-wallet.helpers";
import { useAgentWallets as useAgentWalletSummaries } from "@/components/settings/wallets/agents/lib/use-agent-wallets";

import type { WalletOption } from "./action-menu-types";
import { DEFAULT_EVM_CHAIN_ID, toOptionalChainId } from "./action-menu-types";

export function useComposerWalletOptions() {
  const { chainId, switchChain, address } = useConnectEoaWallet();
  const cdpWallets = useResolvedCdpWallets();
  const { data: userWallets } = useUserWallets();
  const { selectedWallet, selectedWalletAddress, setSelectedWallet } =
    useSelectedWallet();
  const { agents } = useAgentWalletSummaries();

  const agentKitWallets = useMemo<WalletOption[]>(() => {
    if (!Array.isArray(agents) || agents.length === 0) return [];

    return agents.flatMap((agent) =>
      agent.wallets.flatMap((wallet) => {
        if (wallet.status !== "active" || !wallet.address) {
          return [];
        }

        const chainIdValue = toOptionalChainId(wallet.chainId);
        const platform =
          wallet.platform.trim().toLowerCase().includes("sol") ? "solana" : "evm";

        return [
          {
            id: `agentkit-${agent.id}-${wallet.address}-${platform}`,
            kind: "agentkit",
            platform,
            address: wallet.address,
            label: wallet.label?.trim() || `${agent.name} AgentKit Wallet`,
            chainId:
              platform === "evm"
                ? (chainIdValue ?? DEFAULT_EVM_CHAIN_ID)
                : null,
            source: "chat_composer",
            agentId: agent.id,
            agentName: agent.name,
            avatarSeed: wallet.address,
            typeLabel: "AgentKit Wallet",
          },
        ];
      }),
    );
  }, [agents]);

  const availableWallets = useMemo<WalletOption[]>(() => {
    const wallets: WalletOption[] = [];

    if (address) {
      wallets.push({
        ...buildEoaWalletSelection({
          address,
          chainId,
        }),
        avatarSeed: address,
        typeLabel: "EOA Wallet",
      });
    }

    if (cdpWallets.evmAddress) {
      wallets.push({
        ...buildCdpEvmWalletSelection({
          address: cdpWallets.evmAddress,
          label: "Nex Wallet (EVM)",
          preferredChainId:
            selectedWallet?.kind === "cdp_evm_smart" ? selectedWallet.chainId : null,
          wallets: userWallets?.wallets,
        }),
        avatarSeed: cdpWallets.evmAddress,
        typeLabel: "Nex Wallet",
      });
    }

    if (cdpWallets.solanaAddress) {
      wallets.push({
        ...buildCdpSolanaWalletSelection({
          address: cdpWallets.solanaAddress,
          label: "Nex Wallet (SOL)",
        }),
        avatarSeed: cdpWallets.solanaAddress,
        typeLabel: "Nex Wallet",
      });
    }

    wallets.push(...agentKitWallets);
    return wallets;
  }, [address, agentKitWallets, cdpWallets.evmAddress, cdpWallets.solanaAddress, chainId, selectedWallet, userWallets?.wallets]);

  const activeWallet = useMemo(
    () =>
      availableWallets.find((wallet) => selectedWallet?.id === wallet.id) ??
      availableWallets.find((wallet) => wallet.address === selectedWalletAddress) ??
      availableWallets[0] ??
      null,
    [availableWallets, selectedWallet?.id, selectedWalletAddress],
  );

  const selectWallet = useCallback(
    (wallet: SelectedWalletSelection | null) => {
      setSelectedWallet(wallet);
    },
    [setSelectedWallet],
  );

  return {
    activeWallet,
    availableWallets,
    chainId,
    switchChain,
    selectedWallet,
    selectedWalletAddress,
    selectWallet,
  };
}
