"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useConnectEoaWallet } from "@/lib/hooks/wallet/use-connect-eoa-wallet";
import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";
import { useUserWallets } from "@/lib/hooks/wallets/profile/use-user-wallets";

import {
  buildManualWalletSelection,
  getDefaultSelection,
  toKnownWalletSelection,
} from "./use-selected-wallet.helpers";
import type {
  SelectedWalletContextType,
  SelectedWalletProviderProps,
  SelectedWalletSelection,
} from "./use-selected-wallet.types";

const SelectedWalletContext = createContext<SelectedWalletContextType | undefined>(undefined);

export type {
  SelectedWalletContextType,
  SelectedWalletKind,
  SelectedWalletPlatform,
  SelectedWalletSelection,
} from "./use-selected-wallet.types";

export function SelectedWalletProvider({ children }: SelectedWalletProviderProps) {
  const [selectedWallet, setSelectedWallet] = useState<SelectedWalletSelection | null>(null);
  const { address, chainId } = useConnectEoaWallet();
  const cdpWallets = useResolvedCdpWallets();
  const { data: userWallets } = useUserWallets();
  const selectedWalletAddress = selectedWallet?.address ?? null;

  const setSelectedWalletAddress = useCallback(
    (walletAddress: string | null) => {
      if (!walletAddress) {
        setSelectedWallet(null);
        return;
      }

      const knownWallet = toKnownWalletSelection({
        value: walletAddress,
        eoaAddress: address,
        eoaChainId: chainId,
        cdpEvmAddress: cdpWallets.evmAddress,
        cdpSolanaAddress: cdpWallets.solanaAddress,
        currentWallet: selectedWallet,
        wallets: userWallets?.wallets,
      });

      if (knownWallet) {
        setSelectedWallet(knownWallet);
        return;
      }

      setSelectedWallet(buildManualWalletSelection(walletAddress));
    },
    [address, chainId, cdpWallets.evmAddress, cdpWallets.solanaAddress, selectedWallet, userWallets?.wallets],
  );

  // Keep auto-selected wallets in sync with current wallet providers.
  useEffect(() => {
    setSelectedWallet((current) => {
      if (!current) {
        return getDefaultSelection({
          eoaAddress: address,
          eoaChainId: chainId,
          cdpEvmAddress: cdpWallets.evmAddress,
          cdpSolanaAddress: cdpWallets.solanaAddress,
          wallets: userWallets?.wallets,
        });
      }

      if (current.kind === "agentkit") {
        return current;
      }

      const refreshed = toKnownWalletSelection({
        value: current.address,
        eoaAddress: address,
        eoaChainId: chainId,
        cdpEvmAddress: cdpWallets.evmAddress,
        cdpSolanaAddress: cdpWallets.solanaAddress,
        currentWallet: current,
        wallets: userWallets?.wallets,
      });

      if (!refreshed) {
        if (current.kind === "cdp_evm_smart" || current.kind === "cdp_solana_embedded") {
          return current;
        }
        return getDefaultSelection({
          eoaAddress: address,
          eoaChainId: chainId,
          cdpEvmAddress: cdpWallets.evmAddress,
          cdpSolanaAddress: cdpWallets.solanaAddress,
          currentWallet: current,
          wallets: userWallets?.wallets,
        });
      }

      return refreshed;
    });
  }, [address, chainId, cdpWallets.evmAddress, cdpWallets.solanaAddress, userWallets?.wallets]);

  const contextValue = useMemo<SelectedWalletContextType>(
    () => ({
      selectedWallet,
      selectedWalletAddress,
      setSelectedWallet,
      setSelectedWalletAddress,
    }),
    [selectedWallet, selectedWalletAddress, setSelectedWalletAddress],
  );

  return (
    <SelectedWalletContext.Provider value={contextValue}>
      {children}
    </SelectedWalletContext.Provider>
  );
}

export function useSelectedWallet() {
  const context = useContext(SelectedWalletContext);

  const [fallbackSelectedWallet, setFallbackSelectedWallet] = useState<SelectedWalletSelection | null>(null);
  const fallbackSelectedWalletAddress = fallbackSelectedWallet?.address ?? null;
  const setFallbackSelectedWalletAddress = useCallback((walletAddress: string | null) => {
    if (!walletAddress) {
      setFallbackSelectedWallet(null);
      return;
    }
    setFallbackSelectedWallet(buildManualWalletSelection(walletAddress));
  }, []);

  if (context === undefined) {
    return {
      selectedWallet: fallbackSelectedWallet,
      selectedWalletAddress: fallbackSelectedWalletAddress,
      setSelectedWallet: setFallbackSelectedWallet,
      setSelectedWalletAddress: setFallbackSelectedWalletAddress,
    };
  }

  return context;
}
