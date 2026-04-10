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
  AnchorStrategyPayload,
  AutomationStrategyRecord,
  CreateStrategyBindingPayload,
  CreateStrategyPayload,
  StrategyBindingRecord,
  UpdateStrategyBindingPayload,
  UpdateStrategyPayload,
} from "@/modules/automation/types";
import {
  anchorStrategyRequest,
  automationQueryKeys,
  createStrategyBindingRequest,
  createStrategyRequest,
  deactivateStrategyRequest,
  deleteStrategyBindingRequest,
  fetchStrategies,
  fetchStrategyBindings,
  updateStrategyBindingRequest,
  updateStrategyRequest,
} from "@/modules/automation/services/automation-api.client";

type MutationBase<TInput, TResult> = UseMutationResult<TResult, Error, TInput>;

export function useAutomationStrategies(): UseQueryResult<AutomationStrategyRecord[], Error> {
  const { isAuthenticated } = useAuthContext();
  return useQuery({
    queryKey: automationQueryKeys.strategies,
    queryFn: ({ signal }) => fetchStrategies({ signal }),
    enabled: isAuthenticated,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateAutomationStrategy(): MutationBase<
  CreateStrategyPayload,
  AutomationStrategyRecord
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStrategyRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationQueryKeys.strategies }).catch(() => {});
    },
  });
}

export function useUpdateAutomationStrategy(): MutationBase<
  { id: string; payload: UpdateStrategyPayload },
  AutomationStrategyRecord
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateStrategyRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationQueryKeys.strategies }).catch(() => {});
    },
  });
}

export function useAnchorAutomationStrategy(): MutationBase<
  { id: string; payload: AnchorStrategyPayload },
  AutomationStrategyRecord
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: anchorStrategyRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationQueryKeys.strategies }).catch(() => {});
    },
  });
}

export function useDeactivateAutomationStrategy(): MutationBase<
  string,
  AutomationStrategyRecord
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deactivateStrategyRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationQueryKeys.strategies }).catch(() => {});
    },
  });
}

export function useStrategyBindings(
  strategyId: string | null,
  enabled = true,
): UseQueryResult<StrategyBindingRecord[], Error> {
  const { isAuthenticated } = useAuthContext();
  const queryKey = strategyId
    ? automationQueryKeys.strategyBindings(strategyId)
    : automationQueryKeys.emptyStrategyBindings;

  return useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      strategyId
        ? fetchStrategyBindings({ strategyId, signal })
        : Promise.resolve<StrategyBindingRecord[]>([]),
    enabled: Boolean(strategyId) && enabled && isAuthenticated,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateStrategyBinding(
  strategyId: string,
): MutationBase<CreateStrategyBindingPayload, StrategyBindingRecord> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createStrategyBindingRequest({ strategyId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: automationQueryKeys.strategyBindings(strategyId),
      }).catch(() => {});
    },
  });
}

export function useUpdateStrategyBinding(
  strategyId: string,
): MutationBase<
  { bindingId: string; payload: UpdateStrategyBindingPayload },
  StrategyBindingRecord
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bindingId, payload }) =>
      updateStrategyBindingRequest({ strategyId, bindingId, payload }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: automationQueryKeys.strategyBindings(strategyId),
      }).catch(() => {});
      if (variables.bindingId) {
        queryClient.invalidateQueries({ queryKey: automationQueryKeys.strategies }).catch(() => {});
      }
    },
  });
}

export function useDeleteStrategyBinding(
  strategyId: string,
): MutationBase<{ bindingId: string }, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bindingId }) => deleteStrategyBindingRequest({ strategyId, bindingId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: automationQueryKeys.strategyBindings(strategyId),
      }).catch(() => {});
    },
  });
}

