"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { isAddress } from "viem";
import { useBalance } from "wagmi";

import { useConnectEoaWallet } from "@/lib/hooks/wallet/use-connect-eoa-wallet";
import { getSupportedChains } from "@/lib/chains";
import type { WalletSnapshot } from "@/modules/wallets/profile";
import { fetchGuestWalletSnapshot } from "@/server/actions/guest-wallet";
import { logger } from "@/lib/logger";

import { buildEoaWalletSnapshot } from "./wallets-sidebar-flyout.snapshots";

export function useWalletsSidebarEoaSnapshot(walletsData: WalletSnapshot[] | undefined) {
  const [guestWalletData, setGuestWalletData] = useState<WalletSnapshot | null>(null);
  const { isConnected, isEvmConnected, address, chainId, connectedWallet } = useConnectEoaWallet();
  const canQueryBalance = isEvmConnected && typeof address === "string" && isAddress(address);
  const { data: balance } = useBalance({
    address: canQueryBalance ? (address as `0x${string}`) : undefined,
    chainId: canQueryBalance ? chainId : undefined,
    query: { enabled: canQueryBalance },
  });
  const supportedChains = useMemo(() => getSupportedChains(), []);

  useEffect(() => {
    if (!isConnected || !address || !chainId) {
      setGuestWalletData(null);
      return;
    }

    const isInDb = walletsData?.some((wallet) => wallet.address?.toLowerCase() === address.toLowerCase());
    if (isInDb) {
      setGuestWalletData(null);
      return;
    }

    setGuestWalletData((current) => (current?.address === address ? current : null));
    startTransition(async () => {
      const snapshot = await fetchGuestWalletSnapshot(address, chainId);
      if (snapshot && "error" in snapshot) {
        logger.warn("[GuestWallet] Failed to fetch:", snapshot.error);
        setGuestWalletData(null);
        return;
      }
      setGuestWalletData(snapshot ?? null);
    });
  }, [address, chainId, isConnected, walletsData]);

  return useMemo(
    () =>
      buildEoaWalletSnapshot({
        isConnected,
        canQueryBalance,
        address,
        chainId,
        connectedWallet,
        balance,
        supportedChains,
        guestWalletData,
      }),
    [address, balance, canQueryBalance, chainId, connectedWallet, guestWalletData, isConnected, supportedChains],
  );
}
