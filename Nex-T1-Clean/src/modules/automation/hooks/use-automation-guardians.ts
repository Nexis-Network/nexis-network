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
  CreateCouncilPayload,
  CreateGuardianMemberPayload,
  CreateOverrideEventPayload,
  GuardianCouncilRecord,
  GuardianMemberRecord,
  OverrideEventRecord,
  UpdateCouncilPayload,
  UpdateGuardianMemberPayload,
  UpdateOverrideEventPayload,
} from "@/modules/automation/types";
import {
  addGuardianMemberRequest,
  automationQueryKeys,
  createGuardianCouncilRequest,
  createOverrideEventRequest,
  deleteGuardianCouncilRequest,
  fetchGuardianCouncils,
  fetchGuardianMembers,
  fetchOverrideEvents,
  removeGuardianMemberRequest,
  updateGuardianCouncilRequest,
  updateGuardianMemberRequest,
  updateOverrideEventRequest,
} from "@/modules/automation/services/automation-api.client";

type MutationBase<TInput, TResult> = UseMutationResult<TResult, Error, TInput>;

export function useGuardianCouncils(): UseQueryResult<GuardianCouncilRecord[], Error> {
  const { isAuthenticated } = useAuthContext();
  return useQuery({
    queryKey: automationQueryKeys.councils,
    queryFn: ({ signal }) => fetchGuardianCouncils({ signal }),
    enabled: isAuthenticated,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateGuardianCouncil(): MutationBase<
  CreateCouncilPayload,
  GuardianCouncilRecord
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGuardianCouncilRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationQueryKeys.councils }).catch(() => {});
    },
  });
}

export function useUpdateGuardianCouncil(): MutationBase<
  { councilId: string; payload: UpdateCouncilPayload },
  GuardianCouncilRecord
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateGuardianCouncilRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationQueryKeys.councils }).catch(() => {});
    },
  });
}

export function useDeleteGuardianCouncil(): MutationBase<string, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteGuardianCouncilRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationQueryKeys.councils }).catch(() => {});
    },
  });
}

export function useGuardianMembers(
  councilId: string | null,
  enabled = true,
): UseQueryResult<GuardianMemberRecord[], Error> {
  const { isAuthenticated } = useAuthContext();
  const queryKey = councilId
    ? automationQueryKeys.councilMembers(councilId)
    : automationQueryKeys.emptyCouncilMembers;

  return useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      councilId
        ? fetchGuardianMembers({ councilId, signal })
        : Promise.resolve<GuardianMemberRecord[]>([]),
    enabled: Boolean(councilId) && enabled && isAuthenticated,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useAddGuardianMember(
  councilId: string,
): MutationBase<CreateGuardianMemberPayload, GuardianMemberRecord> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => addGuardianMemberRequest({ councilId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: automationQueryKeys.councilMembers(councilId),
      }).catch(() => {});
    },
  });
}

export function useUpdateGuardianMember(
  councilId: string,
): MutationBase<
  { memberId: string; payload: UpdateGuardianMemberPayload },
  GuardianMemberRecord
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, payload }) =>
      updateGuardianMemberRequest({ councilId, memberId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: automationQueryKeys.councilMembers(councilId),
      }).catch(() => {});
    },
  });
}

export function useRemoveGuardianMember(
  councilId: string,
): MutationBase<{ memberId: string }, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId }) => removeGuardianMemberRequest({ councilId, memberId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: automationQueryKeys.councilMembers(councilId),
      }).catch(() => {});
    },
  });
}

export function useOverrideEvents(
  councilId: string | null,
  enabled = true,
): UseQueryResult<OverrideEventRecord[], Error> {
  const { isAuthenticated } = useAuthContext();
  const queryKey = councilId
    ? automationQueryKeys.overrideEvents(councilId)
    : automationQueryKeys.emptyOverrideEvents;

  return useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      councilId
        ? fetchOverrideEvents({ councilId, signal })
        : Promise.resolve<OverrideEventRecord[]>([]),
    enabled: Boolean(councilId) && enabled && isAuthenticated,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateOverrideEvent(
  councilId: string,
): MutationBase<CreateOverrideEventPayload, OverrideEventRecord> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createOverrideEventRequest({ councilId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: automationQueryKeys.overrideEvents(councilId),
      }).catch(() => {});
    },
  });
}

export function useUpdateOverrideEvent(
  councilId: string,
): MutationBase<
  { eventId: string; payload: UpdateOverrideEventPayload },
  OverrideEventRecord
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, payload }) =>
      updateOverrideEventRequest({ councilId, eventId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: automationQueryKeys.overrideEvents(councilId),
      }).catch(() => {});
    },
  });
}

