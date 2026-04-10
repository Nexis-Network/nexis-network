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
  AutomationSessionKey,
  CreateSessionKeyPayload,
  RevokeSessionKeyPayload,
} from "@/modules/automation/types";
import {
  automationQueryKeys,
  createSessionKeyRequest,
  fetchSessionKeys,
  revokeSessionKeyRequest,
} from "@/modules/automation/services/automation-api.client";

type MutationBase<TInput, TResult> = UseMutationResult<TResult, Error, TInput>;

export function useSessionKeys(): UseQueryResult<AutomationSessionKey[], Error> {
  const { isAuthenticated } = useAuthContext();
  return useQuery({
    queryKey: automationQueryKeys.sessionKeys,
    queryFn: ({ signal }) => fetchSessionKeys({ signal }),
    enabled: isAuthenticated,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateSessionKey(): MutationBase<
  CreateSessionKeyPayload,
  AutomationSessionKey
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSessionKeyRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationQueryKeys.sessionKeys }).catch(() => {});
    },
  });
}

export function useRevokeSessionKey(): MutationBase<
  { id: string; payload: RevokeSessionKeyPayload },
  AutomationSessionKey
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeSessionKeyRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationQueryKeys.sessionKeys }).catch(() => {});
    },
  });
}

