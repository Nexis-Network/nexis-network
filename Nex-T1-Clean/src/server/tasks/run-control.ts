import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskSchedule } from "@/modules/tasks";
import { computeNextOccurrence } from "@/server/tasks/schedule";
import type { AgentTaskRow } from "@/server/tasks/types";
import type { ConditionEvaluation } from "@/server/tasks/conditions";
import type { JsonObject } from "@/types/json";

type SupabaseServerClient = SupabaseClient;

type RunRecordOptions = {
  triggerType?: "schedule" | "condition";
  triggerId?: string | null;
  payload?: JsonObject;
};

export async function createTaskRunRecord(
  supabase: SupabaseServerClient,
  task: AgentTaskRow,
  options: RunRecordOptions = {},
): Promise<string> {
  const { data, error } = await supabase
    .from("task_runs")
    .insert({
      task_id: task.id,
      trigger_type: options.triggerType ?? "schedule",
      trigger_id: options.triggerId ?? null,
      status: "queued",
      action_type: task.action_type,
      action_payload: task.action_payload,
      payload: {
        snapshot: {
          title: task.title,
          description: task.description,
          agent: task.agent_identifier,
          team: task.team_identifier,
        },
        trigger: options.payload ?? {},
      },
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`Failed to create run record: ${error?.message}`);
  }
  return data.id as string;
}

export async function markTaskQueued(supabase: SupabaseServerClient, taskId: string) {
  await supabase
    .from("agent_tasks")
    .update({
      status: "queued",
      next_run_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);
}

export async function rescheduleAfterConditionsFail(
  supabase: SupabaseServerClient,
  task: AgentTaskRow,
  schedule: TaskSchedule | null,
  evaluation: ConditionEvaluation,
) {
  const summary = evaluation.details.map((detail) => detail.reason ?? detail.type).join("; ");
  const lastRunDate = task.last_run_at ? new Date(task.last_run_at) : null;
  const computedNext =
    schedule && lastRunDate
      ? computeNextOccurrence(schedule, lastRunDate)
      : schedule
        ? computeNextOccurrence(schedule, null)
        : new Date(Date.now() + 60_000);
  const nextRunAt =
    computedNext ?? (schedule?.type === "conditional" ? new Date(Date.now() + 60_000) : null);

  await supabase
    .from("agent_tasks")
    .update({
      status: "set",
      next_run_at: nextRunAt ? nextRunAt.toISOString() : null,
      last_summary: summary,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", task.id);
}
