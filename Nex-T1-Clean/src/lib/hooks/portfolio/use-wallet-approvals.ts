"use client";

import useSWR from "swr";
import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";
import { getApiErrorMessage, unwrapApiPayload } from "@/lib/api-platform";

export interface TokenApproval {
  token_address: string;
  token_symbol: string;
  token_name: string;
  token_logo?: string;
  token_decimals: string;
  spender_address: string;
  spender_label?: string;
  value: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

type ApprovalsPayload = { result: TokenApproval[] };

const fetcher = async (url: string): Promise<ApprovalsPayload> => {
  const res = await fetch(url);
  const payload = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, "Failed to fetch wallet approvals"));
  }

  const parsed = unwrapApiPayload<ApprovalsPayload>(payload);
  return parsed && Array.isArray(parsed.result) ? parsed : { result: [] };
};

export function useWalletApprovals(address: string, chainId: number | string = 1) {
  const isValidAddress = isNonZeroEVMAddress(address);
  const { data, error, isLoading } = useSWR<ApprovalsPayload>(
    isValidAddress ? `/api/portfolio/approvals?address=${address}&chainId=${chainId}` : null,
    fetcher
  );

  return {
    approvals: data?.result || [],
    isLoading,
    error,
  };
}
