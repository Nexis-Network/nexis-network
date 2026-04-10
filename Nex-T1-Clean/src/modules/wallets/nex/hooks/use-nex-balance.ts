"use client";

/**
 * useNexBalance Hook
 * Fetches balances for Nex smart accounts and Solana wallets
 */

import { useQuery } from "@tanstack/react-query";
import { formatEther, formatUnits, type Address } from "viem";
import { createNexPublicClient } from "../client-factory";
import { getChainConfig } from "../chains";


import { logger } from '@/lib/logger';
/**
 * Balance information for a single chain
 */
export interface ChainBalance {
  chainId: number;
  chainName: string;
  symbol: string;
  /** Balance in wei/lamports */
  raw: bigint;
  /** Formatted balance (human readable) */
  formatted: string;
  /** Decimal places */
  decimals: number;
  /** USD value (if available) */
  usdValue?: number;
}

/**
 * All balances for a Nex account
 */
export interface NexBalances {
  evm: ChainBalance[];
  solana: {
    mainnet: ChainBalance | null;
    devnet: ChainBalance | null;
  };
  /** Total USD value across all chains */
  totalUsdValue?: number;
}

/**
 * Fetch native balance for an EVM address
 */
async function fetchEvmBalance(
  address: Address,
  chainId: number
): Promise<ChainBalance | null> {
  try {
    const config = getChainConfig(chainId);
    if (!config) return null;

    const client = createNexPublicClient(chainId);
    const balance = await client.getBalance({ address });

    return {
      chainId,
      chainName: config.name,
      symbol: config.symbol,
      raw: balance,
      formatted: formatEther(balance),
      decimals: 18,
    };
  } catch (error) {
    logger.error(`[Balance] Failed to fetch balance for chain ${chainId}:`, error);
    return null;
  }
}

/**
 * Fetch Solana balance
 */
async function fetchSolanaBalance(
  address: string,
  network: "mainnet" | "devnet"
): Promise<ChainBalance | null> {
  try {
    const rpcUrl = network === "mainnet"
      ? "https://api.mainnet-beta.solana.com"
      : "https://api.devnet.solana.com";

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [address],
      }),
    });

    const data = await response.json();
    const lamports = BigInt(data.result?.value ?? 0);

    return {
      chainId: network === "mainnet" ? 101 : 102, // Custom IDs for Solana
      chainName: network === "mainnet" ? "Solana Mainnet" : "Solana Devnet",
      symbol: "SOL",
      raw: lamports,
      formatted: formatUnits(lamports, 9),
      decimals: 9,
    };
  } catch (error) {
    logger.error(`[Balance] Failed to fetch Solana ${network} balance:`, error);
    return null;
  }
}

/**
 * Hook to fetch balances for a Nex account
 */
export function useNexBalance({
  evmAddress,
  solanaMainnetAddress,
  solanaDevnetAddress,
  chainIds,
  enabled = true,
}: {
  evmAddress?: Address | null;
  solanaMainnetAddress?: string | null;
  solanaDevnetAddress?: string | null;
  /** Specific chain IDs to fetch. If not provided, fetches for default chain only */
  chainIds?: number[];
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [
      "nex-balances",
      evmAddress,
      solanaMainnetAddress,
      solanaDevnetAddress,
      chainIds,
    ],
    queryFn: async (): Promise<NexBalances> => {
      const evmBalances: ChainBalance[] = [];
      let solanaMainnet: ChainBalance | null = null;
      let solanaDevnet: ChainBalance | null = null;

      // Fetch EVM balances
      if (evmAddress) {
        const chainsToFetch = chainIds ?? [8453]; // Default to Base
        
        const balancePromises = chainsToFetch.map((chainId) =>
          fetchEvmBalance(evmAddress, chainId)
        );
        
        const results = await Promise.all(balancePromises);
        for (const balance of results) {
          if (balance) {
            evmBalances.push(balance);
          }
        }
      }

      // Fetch Solana balances
      if (solanaMainnetAddress) {
        solanaMainnet = await fetchSolanaBalance(solanaMainnetAddress, "mainnet");
      }
      if (solanaDevnetAddress) {
        solanaDevnet = await fetchSolanaBalance(solanaDevnetAddress, "devnet");
      }

      return {
        evm: evmBalances,
        solana: {
          mainnet: solanaMainnet,
          devnet: solanaDevnet,
        },
      };
    },
    enabled: enabled && !!(evmAddress || solanaMainnetAddress || solanaDevnetAddress),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
}

/**
 * Hook to fetch balance for a single chain
 */
export function useEvmChainBalance({
  address,
  chainId,
  enabled = true,
}: {
  address?: Address | null;
  chainId: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["evm-chain-balance", address, chainId],
    queryFn: async () => {
      if (!address) return null;
      return fetchEvmBalance(address, chainId);
    },
    enabled: enabled && !!address,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

/**
 * Hook to fetch Solana balance
 */
export function useSolanaBalance({
  address,
  network,
  enabled = true,
}: {
  address?: string | null;
  network: "mainnet" | "devnet";
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["solana-balance", address, network],
    queryFn: async () => {
      if (!address) return null;
      return fetchSolanaBalance(address, network);
    },
    enabled: enabled && !!address,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}
