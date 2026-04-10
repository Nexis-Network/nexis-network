"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import { getApiErrorMessage, unwrapApiPayload } from "@/lib/api-platform";
import { useAuthContext } from "@/hooks/auth/use-auth-context";
import { normalizeTaskList, type NormalizedTaskList } from "@/modules/tasks";

type UseUserTasksOptions = {
  status?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
};

function isRecord(value: unknown): value is Record<string, UntypedJson> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function useUserTasks(options: UseUserTasksOptions = {}) {
  const { isAuthenticated, user } = useAuthContext();

  const queryKey = useMemo(
    () => [
      "user-tasks",
      isAuthenticated ? user?.id ?? "unknown" : "guest",
      options.status ?? "all",
      options.limit ?? "default",
      options.offset ?? "0",
    ],
    [isAuthenticated, user?.id, options.status, options.limit, options.offset],
  );

  // Realtime subscription for task list updates
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel("user-tasks-list")
      .on(
        "postgres_changes", 
        { 
          event: "*", 
          schema: "public", 
          table: "task_runs"
          // Note: We can't easily filter by "user's tasks" without a direct user_id column on task_runs 
          // (it relates via task_id -> task -> user_id).
          // We rely on RLS or just global invalidation for simplicity here.
          // Since this is the user's private channel (if RLS active), it's fine.
        }, 
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id, queryClient]);

  return useQuery<NormalizedTaskList>({
    queryKey,
    queryFn: ({ signal }) =>
      fetchUserTasks({
        status: options.status,
        limit: options.limit,
        offset: options.offset,
        signal,
      }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: (options.enabled ?? true) && isAuthenticated,
    placeholderData: keepPreviousData,
  });
}

export function normalizeTaskListPayload(payload: UntypedJson): NormalizedTaskList {
  const unwrappedPayload = unwrapApiPayload<UntypedJson>(payload);
  if (unwrappedPayload !== null) {
    return normalizeTaskList(unwrappedPayload);
  }

  if (isRecord(payload) && isRecord(payload.error) && "details" in payload.error) {
    return normalizeTaskList(payload.error.details ?? null);
  }

  return buildEmptyTasksEnvelope();
}

async function parseTaskListResponse(response: Response): Promise<NormalizedTaskList> {
  const raw = await response.text().catch(() => "");
  let payload: UntypedJson = null;

  if (raw) {
    try {
      payload = JSON.parse(raw) as UntypedJson;
    } catch {
      payload = null;
    }
  }

  const normalizedPayload = normalizeTaskListPayload(payload);

  if (!response.ok) {
    if (response.status >= 500 && normalizedPayload.tasks.length === 0) {
      return normalizedPayload;
    }

    throw new Error(
      getApiErrorMessage(payload, raw || "Failed to load tasks"),
    );
  }

  return normalizedPayload;
}

async function fetchUserTasks({
  status,
  limit,
  offset,
  signal,
}: {
  status?: string;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}): Promise<NormalizedTaskList> {
  const params = new URLSearchParams();
  if (status && status.trim().length > 0 && status !== "all") {
    params.set("status", status.trim());
  }
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    params.set("limit", String(limit));
  }
  if (typeof offset === "number" && Number.isFinite(offset) && offset > 0) {
    params.set("offset", String(offset));
  }

  const query = params.toString();
  const { data: { session } } = await createClient().auth.getSession();
  const token = session?.access_token;
  const response = await fetch(`/api/nex/tasks/list${query ? `?${query}` : ""}`, {
    method: "GET",
    signal,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.status === 401) {
    return buildEmptyTasksEnvelope();
  }

  return parseTaskListResponse(response);
}

function buildEmptyTasksEnvelope(): NormalizedTaskList {
  return {
    tasks: [],
    total: 0,
    hasMore: false,
    nextOffset: null,
    fetchedAt: new Date().toISOString(),
  };
}
