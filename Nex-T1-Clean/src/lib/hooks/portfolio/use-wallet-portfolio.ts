"use client";

import useSWR from "swr";
import { isNonZeroEVMAddress, isValidSolanaAddress } from "@/lib/utils/token-utils";
import { getApiErrorMessage, unwrapApiPayload } from "@/lib/api-platform";

export interface WalletPortfolioData {
  address: string;
  chain: string;
  native: {
    balance: string;
    formatted: number;
  };
  tokens: {
    token_address: string;
    name: string;
    symbol: string;
    logo?: string;
    decimals: number;
    balance: string;
    usd_price: number;
    usd_value: number;
    portfolio_percentage: number;
  }[];
  nfts: {
     token_address: string;
     name: string;
     symbol: string;
     media?: {
        original_media_url?: string;
     };
     normalized_metadata?: {
         image?: string;
     };
  }[];
  defi: {
      protocol: string;
      name: string;
      logo: string;
      net_usd_value: number;
  }[];
  profitability: {
      total_usd_value: number;
      total_realized_pnl_usd: number;
      total_unrealized_pnl_usd: number;
      total_pnl_usd: number;
      total_pnl_percentage: number;
  };
  netWorthUsd: number;
  pnlUsd: number;
  pnlPercent: number;
}

const fetcher = async (url: string): Promise<WalletPortfolioData> => {
  const res = await fetch(url);
  const payload = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, "Failed to fetch wallet portfolio"));
  }

  const parsed = unwrapApiPayload<WalletPortfolioData>(payload);
  if (!parsed) {
    throw new Error("Invalid wallet portfolio response");
  }

  return parsed;
};

export function useWalletPortfolio(address: string, chainId: number | string) {
  const normalizedChain = String(chainId ?? "");
  const isValidAddress = (() => {
    if (!address) return false;
    if (normalizedChain === "solana" || normalizedChain === "101") {
      return isValidSolanaAddress(address);
    }
    return isNonZeroEVMAddress(address);
  })();

  const { data, error, isLoading, mutate } = useSWR<WalletPortfolioData>(
    isValidAddress ? `/api/portfolio/wallet-data?address=${encodeURIComponent(address)}&chainId=${encodeURIComponent(String(chainId))}` : null,
    fetcher,
    {
      refreshInterval: 60000, // 1 minute
      revalidateOnFocus: false,
    }
  );

  return {
    data,
    isLoading,
    error,
    mutate,
  };
}
