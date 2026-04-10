"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { loadCreditBalance, type CreditSummary } from "@/lib/credits";
import { useAuthContext } from "@/hooks/auth/use-auth-context";

type CreditsContextValue = {
  credits: number | null;
  limit: number | null;
  monthlyRemaining: number | null;
  overageCredits: number | null;
  plan: string | null;
  reset: string | null;
  loading: boolean;
  error: string | null;
  deductCredits: (amount: number) => void;
  addCredits: (amount: number) => void;
  refreshCredits: () => Promise<void>;
};

const defaultValue: CreditsContextValue = {
  credits: 0,
  limit: null,
  monthlyRemaining: null,
  overageCredits: null,
  plan: null,
  reset: null,
  loading: false,
  error: null,
  deductCredits: () => undefined,
  addCredits: () => undefined,
  refreshCredits: async () => undefined,
};

const CreditsContext = createContext<CreditsContextValue>(defaultValue);

type CreditsProviderProps = {
  children: ReactNode;
};

export function CreditsProvider({ children }: CreditsProviderProps) {
  const { isAuthenticated, isSyncing, session } = useAuthContext();
  const queryClient = useQueryClient();
  const activeUserId = session?.user?.id ?? null;
  const creditBalanceKey = useMemo(
    () => ["credit-balance", activeUserId ?? "anon"] as const,
    [activeUserId],
  );

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<CreditSummary | null, Error>({
    queryKey: creditBalanceKey,
    queryFn: ({ signal }) => loadCreditBalance({ signal, accessToken: session?.access_token ?? null }),
    enabled: isAuthenticated && !isSyncing,
    staleTime: 60_000,
    retry: 1,
  });

  const credits = useMemo(() => {
    if (!isAuthenticated) {
      return null;
    }
    const remaining = data?.remaining;
    return typeof remaining === "number" && Number.isFinite(remaining) ? remaining : null;
  }, [data?.remaining, isAuthenticated]);

  const limit = useMemo(() => {
    if (!isAuthenticated) {
      return null;
    }
    const value = data?.limit;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }, [data?.limit, isAuthenticated]);

  const monthlyRemaining = useMemo(() => {
    if (!isAuthenticated) {
      return null;
    }

    const explicitValue = data?.monthlyRemaining;
    if (typeof explicitValue === "number" && Number.isFinite(explicitValue)) {
      return explicitValue;
    }

    if (
      typeof data?.limit === "number" &&
      typeof data?.used === "number" &&
      Number.isFinite(data.limit) &&
      Number.isFinite(data.used)
    ) {
      return Math.max(data.limit - data.used, 0);
    }

    return null;
  }, [data?.limit, data?.monthlyRemaining, data?.used, isAuthenticated]);

  const overageCredits = useMemo(() => {
    if (!isAuthenticated) {
      return null;
    }

    const explicitValue = data?.overageCredits;
    if (typeof explicitValue === "number" && Number.isFinite(explicitValue)) {
      return explicitValue;
    }

    if (
      typeof data?.remaining === "number" &&
      Number.isFinite(data.remaining) &&
      typeof monthlyRemaining === "number" &&
      Number.isFinite(monthlyRemaining)
    ) {
      return Math.max(data.remaining - monthlyRemaining, 0);
    }

    return null;
  }, [data?.overageCredits, data?.remaining, isAuthenticated, monthlyRemaining]);

  const plan = useMemo(() => {
    if (!isAuthenticated) {
      return null;
    }
    return typeof data?.plan === "string" ? data.plan : null;
  }, [data?.plan, isAuthenticated]);

  const reset = useMemo(() => {
    if (!isAuthenticated) {
      return null;
    }
    return typeof data?.reset === "string" ? data.reset : null;
  }, [data?.reset, isAuthenticated]);

  const mutateCache = useCallback(
    (delta: number) => {
      if (!Number.isFinite(delta)) {
        return;
      }
      queryClient.setQueryData<CreditSummary | null>(creditBalanceKey, (prev) => {
        const current = prev ?? {
          remaining: null,
          used: null,
          limit: null,
          monthlyRemaining: null,
          overageCredits: null,
          reset: null,
          plan: null,
        };
        const currentRemaining = typeof current.remaining === "number" ? current.remaining : 0;
        const nextRemaining = Math.max(currentRemaining + delta, 0);
        return {
          ...current,
          remaining: nextRemaining,
        };
      });
    },
    [creditBalanceKey, queryClient],
  );

  const refreshCredits = useCallback(async () => {
    if (!isAuthenticated) {
      queryClient.removeQueries({ queryKey: ["credit-balance"] });
      return;
    }
    await refetch();
  }, [isAuthenticated, queryClient, refetch]);

  const deductCredits = useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount)) {
        return;
      }
      mutateCache(-Math.abs(amount));
    },
    [mutateCache],
  );

  const addCredits = useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount)) {
        return;
      }
      mutateCache(Math.abs(amount));
    },
    [mutateCache],
  );

  const value = useMemo(
    () => ({
      credits,
      limit,
      monthlyRemaining,
      overageCredits,
      plan,
      reset,
      loading: isLoading || isFetching,
      error: error ? error.message : null,
      deductCredits,
      addCredits,
      refreshCredits,
    }),
    [
      credits,
      limit,
      monthlyRemaining,
      overageCredits,
      plan,
      reset,
      isLoading,
      isFetching,
      error,
      deductCredits,
      addCredits,
      refreshCredits,
    ],
  );

  return <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>;
}

export function useCreditsContext() {
  return useContext(CreditsContext);
}
