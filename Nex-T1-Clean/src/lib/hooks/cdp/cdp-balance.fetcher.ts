"use client";

import { createClient } from "@/lib/supabase/client";

import type { WalletBalanceResult } from "./cdp-balance.types";

export const CDP_BALANCE_KEY = (
  address: string,
  platform: string,
  chainId?: number,
) => ["cdp-balance", address, platform, chainId] as const;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  const token = session?.access_token;

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchCdpBalance(
  address: string,
  platform: "evm" | "solana",
  chainId?: number,
  signal?: AbortSignal,
): Promise<WalletBalanceResult> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ platform });

  if (typeof chainId === "number") {
    params.set("chainId", String(chainId));
  }

  const response = await fetch(
    `/api/cdp/wallets/${encodeURIComponent(address)}/balance?${params.toString()}`,
    {
      method: "GET",
      signal,
      cache: "no-store",
      headers,
    },
  );

  if (!response.ok) {
    const errorPayload =
      typeof response.json === "function"
        ? await response
            .json()
            .catch(
              () => null as { error?: { message?: string }; message?: string } | null,
            )
        : null;
    const detail =
      errorPayload?.error?.message ??
      errorPayload?.message ??
      (typeof response.text === "function"
        ? await response.text().catch(() => response.statusText)
        : response.statusText);

    throw new Error(detail || `Failed to fetch CDP balance for ${address}`);
  }

  const payload = (await response.json()) as { data?: WalletBalanceResult };
  if (!payload.data) {
    throw new Error("CDP balance response missing data");
  }

  return payload.data;
}

