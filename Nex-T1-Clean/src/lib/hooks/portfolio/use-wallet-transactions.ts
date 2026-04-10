"use client";

import useSWR from "swr";
import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";
import { getApiErrorMessage, unwrapApiPayload } from "@/lib/api-platform";

export interface WalletTransaction {
  hash: string;
  nonce: string;
  from_address: string;
  to_address: string;
  value: string;
  gas: string;
  block_timestamp: string;
  receipt_status: string;
}

type TransactionsPayload = { result: WalletTransaction[] };

const fetcher = async (url: string): Promise<TransactionsPayload> => {
  const res = await fetch(url);
  const payload = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, "Failed to fetch wallet transactions"));
  }

  const parsed = unwrapApiPayload<TransactionsPayload>(payload);
  return parsed && Array.isArray(parsed.result) ? parsed : { result: [] };
};

export function useWalletTransactions(address: string, chainId: number = 1, limit: number = 20) {
  const isValidAddress = isNonZeroEVMAddress(address);
  const { data, error, isLoading } = useSWR<TransactionsPayload>(
    isValidAddress ? `/api/portfolio/wallet-data/transactions?address=${address}&chainId=${chainId}&limit=${limit}` : null,
    fetcher
  );

  return {
    transactions: data?.result || [],
    isLoading,
    error,
  };
}
