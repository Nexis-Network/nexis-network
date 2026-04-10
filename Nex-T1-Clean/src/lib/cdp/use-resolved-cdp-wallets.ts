"use client";

import { useMemo } from "react";

import type { WalletPortfolio } from "@/lib/user/profile";
import { useUserWallets } from "@/lib/hooks/wallets/profile/use-user-wallets";

import { mergeResolvedCdpWalletAddresses } from "./resolve-cdp-wallet-addresses";
import { useCdpWallets, type UseCdpWalletsResult } from "./use-cdp-wallets";

type UseResolvedCdpWalletsOptions = {
  fallbackWallets?: WalletPortfolio[] | null;
};

export function useResolvedCdpWallets(
  options: UseResolvedCdpWalletsOptions = {},
): UseCdpWalletsResult {
  const cdpWallets = useCdpWallets();
  const { data: userWallets } = useUserWallets();

  const resolvedAddresses = useMemo(
    () =>
      mergeResolvedCdpWalletAddresses(
        {
          evmAddress: cdpWallets.evmAddress,
          solanaAddress: cdpWallets.solanaAddress,
        },
        options.fallbackWallets,
        userWallets?.wallets,
      ),
    [
      cdpWallets.evmAddress,
      cdpWallets.solanaAddress,
      options.fallbackWallets,
      userWallets?.wallets,
    ],
  );

  return useMemo(
    () => ({
      ...cdpWallets,
      evmAddress: resolvedAddresses.evmAddress,
      solanaAddress: resolvedAddresses.solanaAddress,
      wallets: [
        {
          chain: "evm",
          address: resolvedAddresses.evmAddress,
          isReady: Boolean(resolvedAddresses.evmAddress),
        },
        {
          chain: "solana",
          address: resolvedAddresses.solanaAddress,
          isReady: Boolean(resolvedAddresses.solanaAddress),
        },
      ],
    }),
    [cdpWallets, resolvedAddresses.evmAddress, resolvedAddresses.solanaAddress],
  );
}
