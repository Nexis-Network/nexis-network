"use client";

/**
 * EVM Chain Balance Hook
 * 
 * Fetches native balance for a specific EVM chain.
 * Uses the current Nex/viem balance implementation.
 */

import { useMemo } from "react";

import { useNexNativeBalance } from "./use-nex-native-balance";
import { useProvisionedWalletAddress } from "./use-provisioned-wallet-address";
import { useNexWalletOptional } from "@/modules/wallets/nex/provider";

type WalletKind = "evm" | "hyperliquid";

type UseEvmChainBalanceOptions = {
  chainId: number;
  walletKind?: WalletKind;
  addressOverride?: string | null;
  enabled?: boolean;
  refetchInterval?: number;
};

export function useEvmChainBalance({
  chainId,
  walletKind = "evm",
  addressOverride,
  enabled = true,
  refetchInterval = 30_000,
}: UseEvmChainBalanceOptions) {
  // Try to get address from Nex wallet context
  const nexWallet = useNexWalletOptional();
  
  // Fallback to provisioned wallet address from DB
  const fallbackProvisionedAddress = useProvisionedWalletAddress(walletKind, chainId);

  // Resolve address: override > Nex wallet > provisioned
  const resolvedAddress = useMemo(() => {
    if (addressOverride) return addressOverride;
    if (walletKind === "evm") {
      if (nexWallet?.evm?.smartAccountAddress) return nexWallet.evm.smartAccountAddress;
      if (nexWallet?.evm?.ownerAddress) return nexWallet.evm.ownerAddress;
    }
    return fallbackProvisionedAddress;
  }, [addressOverride, walletKind, nexWallet?.evm?.ownerAddress, nexWallet?.evm?.smartAccountAddress, fallbackProvisionedAddress]);

  return useNexNativeBalance({
    chainId,
    address: resolvedAddress,
    enabled: enabled && Boolean(resolvedAddress),
    refetchInterval,
  });
}
