"use client";

import { useMemo } from "react";
import { CDP_EMBEDDED_ENABLED } from "@/lib/cdp/feature-flag";

/**
 * Client-side hook to read Nex Wallet state.
 *
 * Reads from CDP hooks (useEvmAddress, useSolanaAddress, useIsSignedIn)
 * which are provided by CDPReactProvider. Returns a unified shape
 * that UI components can consume without caring about the provider.
 *
 * Requires CDPReactProvider to be mounted in the component tree.
 */

export type CdpWalletState = {
  chain: "evm" | "solana";
  address: string | null;
  isReady: boolean;
};

export type UseCdpWalletsResult = {
  wallets: CdpWalletState[];
  evmAddress: string | null;
  solanaAddress: string | null;
  isSignedIn: boolean;
  isInitialized: boolean;
};

/**
 * Hook to access Nex Wallet addresses.
 *
 * When CDP is disabled, returns empty state without throwing. The surrounding
 * provider boundary mounts a mock CDP provider so the inner hook order stays
 * stable even while the feature is off.
 */
export function useCdpWallets(): UseCdpWalletsResult {
  const walletState = useCdpWalletsInner();

  // When CDP is disabled, return a stable empty result
  // while still calling the inner Coinbase hooks through the mock provider.
  const emptyResult = useMemo<UseCdpWalletsResult>(
    () => ({
      wallets: [],
      evmAddress: null,
      solanaAddress: null,
      isSignedIn: false,
      isInitialized: false,
    }),
    [],
  );

  if (!CDP_EMBEDDED_ENABLED) {
    return emptyResult;
  }

  return walletState;
}

/**
 * Inner hook that calls CDP hooks.
 * CdpProvider always mounts a live or mock provider so these hooks stay safe.
 */
function useCdpWalletsInner(): UseCdpWalletsResult {
  const cdpHooks = require("@coinbase/cdp-hooks") as {
    useEvmAddress: () => { address: string | undefined };
    useSolanaAddress: () => { address: string | undefined };
    useIsSignedIn: () => { isSignedIn: boolean };
    useIsInitialized: () => { isInitialized: boolean };
  };

  const { address: evmAddr } = cdpHooks.useEvmAddress();
  const { address: solAddr } = cdpHooks.useSolanaAddress();
  const { isSignedIn } = cdpHooks.useIsSignedIn();
  const { isInitialized } = cdpHooks.useIsInitialized();

  const evmAddress = evmAddr ?? null;
  const solanaAddress = solAddr ?? null;

  const wallets = useMemo<CdpWalletState[]>(() => {
    const out: CdpWalletState[] = [];
    out.push({
      chain: "evm",
      address: evmAddress,
      isReady: !!evmAddress,
    });
    out.push({
      chain: "solana",
      address: solanaAddress,
      isReady: !!solanaAddress,
    });
    return out;
  }, [evmAddress, solanaAddress]);

  return {
    wallets,
    evmAddress,
    solanaAddress,
    isSignedIn,
    isInitialized,
  };
}
