"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/hooks/auth/use-auth-context";
import { mapCreditUsageRows, type CreditTransaction } from "@/lib/billing/credit-transaction-mapper";
import { createClient } from "@/lib/supabase/client";


import { logger } from '@/lib/logger';
async function fetchCreditTransactions(userId: string): Promise<CreditTransaction[]> {
  const supabase = createClient();

  // Query with schema-safe selectors to support both legacy and modern table variants.
  const { data, error } = await supabase
    .from("user_credit_usage")
    .select("*")
    .eq("user_id", userId)
    .order("window_start", { ascending: false })
    .limit(50);

  if (error) {
    logger.warn("[useCreditTransactions] Failed to fetch:", error);
    return [];
  }

  return mapCreditUsageRows(data ?? []);
}

export function useCreditTransactions() {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["credit-transactions", userId],
    queryFn: () => fetchCreditTransactions(userId!),
    enabled: !!userId,
    staleTime: 60_000,
    retry: 1,
  });

  return {
    transactions: data ?? [],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
