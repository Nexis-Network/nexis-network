"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useAuthContext } from "@/hooks/auth/use-auth-context";
import type {
  PaymasterBalanceRecord,
  UpsertPaymasterBalancePayload,
} from "@/modules/automation/types";
import {
  automationQueryKeys,
  fetchPaymasterBalances,
  upsertPaymasterBalanceRequest,
} from "@/modules/automation/services/automation-api.client";

type MutationBase<TInput, TResult> = UseMutationResult<TResult, Error, TInput>;

export function usePaymasterBalances(): UseQueryResult<PaymasterBalanceRecord[], Error> {
  const { isAuthenticated } = useAuthContext();
  return useQuery({
    queryKey: automationQueryKeys.paymasterBalances,
    queryFn: ({ signal }) => fetchPaymasterBalances({ signal }),
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useUpsertPaymasterBalance(): MutationBase<
  UpsertPaymasterBalancePayload,
  PaymasterBalanceRecord
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertPaymasterBalanceRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationQueryKeys.paymasterBalances }).catch(() => {});
    },
  });
}

