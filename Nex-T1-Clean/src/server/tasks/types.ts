import type { TaskActionInput } from "@/modules/tasks/action-schema";
import type { NormalizedTask, TaskSchedule, TaskScheduleCondition } from "@/modules/tasks";
import type { JsonObject } from "@/types/json";

export type TaskStatusType =
  | "set"
  | "scheduled"
  | "queued"
  | "started"
  | "in_progress"
  | "requires_action"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export const ACTIVE_TASK_STATUSES: TaskStatusType[] = ["set", "scheduled", "queued", "started", "in_progress"];

export type AgentTaskRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  agent_identifier: string | null;
  team_identifier: string | null;
  kind: string | null;
  plan_id: string | null;
  horizon: string | null;
  status: TaskStatusType;
  priority: number;
  action_type: string;
  action_payload: JsonObject;
  notification_channels: string[];
  inputs: JsonObject;
  metadata: JsonObject;
  progress: number | null;
  scheduled_for: string | null;
  next_run_at: string | null;
  last_run_at: string | null;
  last_result_at: string | null;
  last_summary: string | null;
  last_error: string | null;
  failure_count: number;
  max_retries: number;
  concurrency_key: string | null;
  locked_by: string | null;
  locked_at: string | null;
  cancelled_at: string | null;
  condition_digest: string | null;
  created_at: string;
  updated_at: string;
  task_schedules?: TaskScheduleRow | null;
  task_conditions?: TaskConditionRow[] | null;
};

export type TaskScheduleRow = {
  task_id: string;
  schedule_type: string;
  timezone: string;
  run_at: string | null;
  offset_ms: number | null;
  long_term_start: string | null;
  recurrence: JsonObject | null;
  summary: string | null;
  definition: TaskSchedule | null;
  created_at: string;
  updated_at: string;
};

export type TaskConditionRow = {
  id: string;
  task_id: string;
  condition_type: string;
  summary: string | null;
  definition: TaskScheduleCondition | null;
  created_at: string;
  updated_at: string;
};

export type TaskTriggerRow = {
  id: string;
  task_id: string;
  condition_id: string | null;
  trigger_type: string;
  status: string;
  payload: JsonObject;
  created_at: string;
  processed_at: string | null;
};

export type TaskRunRow = {
  id: string;
  task_id: string;
  trigger_type: string;
  trigger_id: string | null;
  status: "queued" | "started" | "in_progress" | "requires_action" | "completed" | "failed" | "cancelled";
  action_type: string;
  action_payload: JsonObject;
  payload: JsonObject;
  result_preview: string | null;
  error: JsonObject | null;
  metrics: JsonObject | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  task_results?: TaskResultRow | null;
};

export type TaskRunEventRow = {
  id: string;
  run_id: string;
  event_type: string;
  message: string | null;
  payload: JsonObject;
  created_at: string;
};

export type TaskResultRow = {
  run_id: string;
  output: JsonObject;
  render_hint: string | null;
  created_at: string;
};

export type NormalizedTaskWithSchedule = NormalizedTask & {
  schedule?: TaskSchedule | null;
  action: TaskActionInput;
};

export type TaskHistoryEntry = {
  id: string;
  status: string;
  type: string;
  payload: JsonObject;
  createdAt: string;
  completedAt?: string | null;
  error?: JsonObject | null;
  output?: JsonObject | null;
};
