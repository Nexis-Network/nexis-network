"use client";

import { useAccount } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";

export type UnifiedWalletContext = {
  evm: {
    address: string;
    chainId: number;
    isConnected: boolean;
  } | null;
  solana: {
    address: string;
    isConnected: boolean;
  } | null;
};

export function useUnifiedWallets(): UnifiedWalletContext {
  const { address: evmAddress, chainId, isConnected: isEvmConnected } = useAccount();
  const { publicKey, connected: isSolanaConnected } = useWallet();

  return useMemo(() => {
    return {
      evm: isEvmConnected && evmAddress && chainId ? {
        address: evmAddress,
        chainId: chainId,
        isConnected: true
      } : null,
      solana: isSolanaConnected && publicKey ? {
        address: publicKey.toBase58(),
        isConnected: true
      } : null
    };
  }, [evmAddress, chainId, isEvmConnected, publicKey, isSolanaConnected]);
}
