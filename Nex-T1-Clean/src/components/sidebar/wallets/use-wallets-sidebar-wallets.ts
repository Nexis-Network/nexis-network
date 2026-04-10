"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { resolveCdpEmbeddedEvmSelectionCapability } from "@/lib/cdp/cdp-wallet-selection";
import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";
import { useCdpBalance } from "@/lib/hooks/cdp/use-cdp-balance";
import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";
import { useWalletSummaries } from "@/hooks/wallets/profile/use-wallet-summaries";

import { buildSidebarWallets } from "./wallets-sidebar-flyout.helpers";
import {
  buildCdpEvmWalletSnapshot,
  buildCdpSolanaWalletSnapshot,
} from "./wallets-sidebar-flyout.cdp-snapshots";
import { useWalletsSidebarEoaSnapshot } from "./use-wallets-sidebar-eoa-snapshot";

export function useWalletsSidebarWallets(isOpen: boolean) {
  const [refreshKey, setRefreshKey] = useState<number | null>(null);
  const { data: profileData } = useProfileAggregate();
  const walletQuery = useWalletSummaries({
    enabled: isOpen,
    refreshKey,
    forceRefresh: Boolean(refreshKey),
  });
  const walletsData = walletQuery.data?.wallets;

  useEffect(() => {
    if (refreshKey && walletQuery.isFetched) {
      setRefreshKey(null);
    }
  }, [refreshKey, walletQuery.isFetched]);
  const eoaWalletSnapshot = useWalletsSidebarEoaSnapshot(walletsData);

  const { evmAddress: cdpEvmAddress, solanaAddress: cdpSolanaAddress } =
    useResolvedCdpWallets();
  const cdpEvmCapability = useMemo(
    () =>
      resolveCdpEmbeddedEvmSelectionCapability({
        address: cdpEvmAddress,
        wallets: profileData?.wallets,
      }),
    [cdpEvmAddress, profileData?.wallets],
  );
  const { data: cdpEvmBalance } = useCdpBalance(cdpEvmAddress, "evm", cdpEvmCapability.chainId);
  const { data: cdpSolanaBalance } = useCdpBalance(cdpSolanaAddress, "solana");

  const cdpEvmSnapshot = useMemo(
    () =>
      buildCdpEvmWalletSnapshot({
        address: cdpEvmAddress,
        label: profileData?.identity?.ensName ?? cdpEvmCapability.label,
        capability: cdpEvmCapability,
        balance: cdpEvmBalance,
      }),
    [cdpEvmAddress, cdpEvmBalance, cdpEvmCapability, profileData?.identity?.ensName],
  );
  const cdpSolanaSnapshot = useMemo(
    () =>
      buildCdpSolanaWalletSnapshot({
        address: cdpSolanaAddress,
        balance: cdpSolanaBalance,
      }),
    [cdpSolanaAddress, cdpSolanaBalance],
  );

  const wallets = useMemo(
    () =>
      buildSidebarWallets({
        walletsData,
        eoaWalletSnapshot,
        cdpEvmSnapshot,
        cdpSolanaSnapshot,
      }),
    [cdpEvmSnapshot, cdpSolanaSnapshot, eoaWalletSnapshot, walletsData],
  );

  const refresh = useCallback(() => {
    setRefreshKey(Date.now());
  }, []);

  return {
    wallets,
    isLoading: walletQuery.isLoading,
    refresh,
  };
}
