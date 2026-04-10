"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type TaskRunEvent = {
  id: string;
  event_type: string;
  payload: Record<string, UntypedJson>;
  created_at: string;
};

export type TaskRunDetail = {
  id: string;
  status: string;
  triggerType: string;
  startedAt: string | null;
  completedAt: string | null;
  summary: string | null;
  error: Record<string, UntypedJson> | null;
  output: Record<string, UntypedJson> | null;
  renderHint: string | null;
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    scheduleSummary: string | null;
  };
  events: TaskRunEvent[];
};

type TaskRunDetailResponse = {
  run: TaskRunDetail;
};

export function useTaskRunDetail(runId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!runId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`task-run:${runId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task_run_events",
          filter: `run_id=eq.${runId}`,
        },
        () => {
           queryClient.invalidateQueries({ queryKey: ["task-run-detail", runId] });
        }
      )
      .on(
        "postgres_changes",
         {
           event: "UPDATE",
           schema: "public",
           table: "task_runs",
           filter: `id=eq.${runId}`,
         },
         () => {
            queryClient.invalidateQueries({ queryKey: ["task-run-detail", runId] });
         }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, queryClient]);

  return useQuery<TaskRunDetail>({
    queryKey: ["task-run-detail", runId],
    enabled: Boolean(runId),
    queryFn: async () => {
      if (!runId) {
        throw new Error("runId is required");
      }
      const { data: { session } } = await createClient().auth.getSession();
      const token = session?.access_token;
      
      const response = await fetch(`/api/nex/task-runs/${runId}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => response.statusText);
        throw new Error(detail || "Unable to load run detail");
      }
      const data = (await response.json()) as TaskRunDetailResponse;
      return data.run;
    },
  });
}

