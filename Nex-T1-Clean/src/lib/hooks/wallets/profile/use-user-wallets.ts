"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAuthContext } from "@/hooks/auth/use-auth-context";
import type { WalletPortfolio } from "@/lib/user/profile";

type WalletResponse = {
  wallets: WalletPortfolio[];
};

async function fetchUserWallets({
  signal,
  accessToken,
}: {
  signal?: AbortSignal;
  accessToken?: string | null;
}): Promise<WalletResponse> {
  const response = await fetch("/api/user/wallets", {
    method: "GET",
    signal,
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (response.status === 401) {
    return { wallets: [] };
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to load user wallets");
  }

  const payload = (await response.json()) as Partial<WalletResponse>;
  return {
    wallets: Array.isArray(payload?.wallets) ? (payload.wallets as WalletPortfolio[]) : [],
  };
}

export function useUserWallets(initial?: WalletResponse) {
  const { isAuthenticated, session, user } = useAuthContext();
  const initialData = useMemo<WalletResponse | undefined>(() => {
    if (!initial) {
      return undefined;
    }
    const wallets = Array.isArray(initial.wallets) ? initial.wallets : [];
    return { wallets };
  }, [initial]);

  const userId = user?.id ?? null;
  const accessToken = session?.access_token ?? null;
  const canQuery = typeof window !== "undefined" && isAuthenticated;

  return useQuery<WalletResponse>({
    queryKey: ["user-wallets", userId],
    queryFn: ({ signal }) => fetchUserWallets({ signal, accessToken }),
    enabled: canQuery,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    initialData,
    placeholderData: initialData ?? keepPreviousData,
  });
}
