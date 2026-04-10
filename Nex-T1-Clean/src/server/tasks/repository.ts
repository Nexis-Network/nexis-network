import "server-only";

import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  describeTaskSchedule,
  normalizeTask,
  type NormalizedTask,
  type NormalizedTaskList,
  type TaskSchedule,
  type TaskScheduleCondition,
} from "@/modules/tasks";
import { parseTaskAction, type NotificationChannel, type TaskActionInput } from "@/modules/tasks/action-schema";
import type { ScheduleTaskPayload } from "@/hooks/tasks/use-schedule-task";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import type {
  AgentTaskRow,
  NormalizedTaskWithSchedule,
  TaskRunEventRow,
  TaskRunRow,
  TaskStatusType,
  TaskResultRow,
} from "@/server/tasks/types";
import { extractScheduleConditions, parseScheduleRow, computeInitialNextRunAt, computeNextOccurrence } from "@/server/tasks/schedule";
import type { TaskResult } from "@/lib/schema";
import { TaskStatus, TaskType } from "@/lib/schema";
import { createSchedule, deleteSchedule } from "@/server/services/aws/scheduler";
import { enqueueTaskJob } from "@/server/tasks/queue";
import { AppError, NotFoundError } from "@/lib/errors";
import {
  isMissingRelationError,
  toSupabaseLogContext,
} from "@/lib/errors/supabase";
import { logger } from "@/lib/logger";
import { observeServerOperation } from "@/server/observability/operations";
import type { JsonObject } from "@/types/json";

const TASKS_DOMAIN = "tasks_repository";
const TASK_SELECT_WITH_RELATIONS = "*, task_schedules(*), task_conditions(*)";

type ListOptions = {
  status?: string;
  limit?: number;
  offset?: number;
};

async function hydrateTaskRowsWithoutEmbeddedRelations(
  supabase: SupabaseClient,
  rows: AgentTaskRow[],
): Promise<AgentTaskRow[]> {
  if (rows.length === 0) {
    return [];
  }

  const taskIds = rows.map((row) => row.id);
  const [{ data: schedules, error: schedulesError }, { data: conditions, error: conditionsError }] =
    await Promise.all([
      supabase.from("task_schedules").select("*").in("task_id", taskIds),
      supabase.from("task_conditions").select("*").in("task_id", taskIds),
    ]);

  if (schedulesError) {
    logger.warn(
      {
        domain: TASKS_DOMAIN,
        operation: "hydrate_task_schedules_fallback",
        ...toSupabaseLogContext(schedulesError),
      },
      "task schedule fallback hydration failed",
    );
  }

  if (conditionsError) {
    logger.warn(
      {
        domain: TASKS_DOMAIN,
        operation: "hydrate_task_conditions_fallback",
        ...toSupabaseLogContext(conditionsError),
      },
      "task condition fallback hydration failed",
    );
  }

  const scheduleByTaskId = new Map(
    (((schedules ?? []) as Array<{ task_id: string } & AgentTaskRow["task_schedules"]>)
      .filter((schedule): schedule is { task_id: string } & NonNullable<AgentTaskRow["task_schedules"]> =>
        Boolean(schedule?.task_id))
      .map((schedule) => [schedule.task_id, schedule])),
  );

  const conditionsByTaskId = new Map<string, NonNullable<AgentTaskRow["task_conditions"]>>();
  for (const condition of
    ((conditions ?? []) as Array<{ task_id: string } & NonNullable<NonNullable<AgentTaskRow["task_conditions"]>[number]>>)) {
    const existing = conditionsByTaskId.get(condition.task_id) ?? [];
    existing.push(condition);
    conditionsByTaskId.set(condition.task_id, existing);
  }

  return rows.map((row) => ({
    ...row,
    task_schedules: scheduleByTaskId.get(row.id) ?? null,
    task_conditions: conditionsByTaskId.get(row.id) ?? [],
  }));
}

export async function fetchTasksForUser(userId: string, options: ListOptions = {}, client?: SupabaseClient): Promise<NormalizedTaskList> {
  return observeServerOperation(
    {
      domain: TASKS_DOMAIN,
      operation: "fetch_for_user",
      budgetMs: 2500,
      context: {
        userId,
        status: options.status ?? null,
        limit: options.limit ?? null,
        offset: options.offset ?? 0,
      },
    },
    async () => {
      const supabase = client ?? getSupabaseAdminClient();
      const buildQuery = (selectClause: string) => {
        let query = supabase
        .from("agent_tasks")
        .select(selectClause)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

        if (options.status && options.status !== "all") {
          query = query.eq("status", options.status);
        }
        if (options.limit && options.limit > 0) {
          const limit = options.limit;
          const offset = Math.max(0, options.offset ?? 0);
          const to = offset + limit - 1;
          query = query.range(offset, to);
        }

        return query;
      };

      const { data, error } = await buildQuery(TASK_SELECT_WITH_RELATIONS);
      if (error) {
        if (!isMissingRelationError(error)) {
          throw new AppError(`Failed to load tasks: ${error.message}`, "INTERNAL_ERROR", 500, true, error);
        }

        logger.warn(
          {
            domain: TASKS_DOMAIN,
            operation: "fetch_for_user_fallback",
            userId,
            ...toSupabaseLogContext(error),
          },
          "tasks relation fallback applied",
        );

        const { data: fallbackData, error: fallbackError } = await buildQuery("*");
        if (fallbackError) {
          throw new AppError(
            `Failed to load tasks: ${fallbackError.message}`,
            "INTERNAL_ERROR",
            500,
            true,
            fallbackError,
          );
        }

        const hydratedRows = await hydrateTaskRowsWithoutEmbeddedRelations(
          supabase,
          ((fallbackData ?? []) as unknown as AgentTaskRow[]),
        );
        const tasks = hydratedRows.map((row) => mapRowToNormalizedTask(row));
        const limit = options.limit ?? tasks.length;
        const offset = Math.max(0, options.offset ?? 0);
        const hasMore = tasks.length === (limit ?? tasks.length);
        const nextOffset = hasMore ? offset + tasks.length : null;

        return {
          tasks,
          total: tasks.length,
          hasMore,
          nextOffset,
          fetchedAt: new Date().toISOString(),
        };
      }
      const rows = ((data ?? []) as unknown as AgentTaskRow[]);
      const tasks = rows.map((row) => mapRowToNormalizedTask(row));
      const limit = options.limit ?? tasks.length;
      const offset = Math.max(0, options.offset ?? 0);
      const hasMore = tasks.length === (limit ?? tasks.length);
      const nextOffset = hasMore ? offset + tasks.length : null;

      return {
        tasks,
        total: tasks.length,
        hasMore,
        nextOffset,
        fetchedAt: new Date().toISOString(),
      };
    },
  );
}

export async function fetchTaskById(taskId: string, client?: SupabaseClient): Promise<AgentTaskRow | null> {
  const supabase = client ?? getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_tasks")
    .select(TASK_SELECT_WITH_RELATIONS)
    .eq("id", taskId)
    .single();
  if (error && isMissingRelationError(error)) {
    const { data: baseData, error: baseError } = await supabase
      .from("agent_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (baseError || !baseData) {
      return null;
    }

    const [hydrated] = await hydrateTaskRowsWithoutEmbeddedRelations(
      supabase,
      [baseData as AgentTaskRow],
    );
    return hydrated ?? null;
  }
  if (error) {
    return null;
  }
  return data as AgentTaskRow;
}

export async function scheduleTaskForUser(userId: string, payload: ScheduleTaskPayload, client?: SupabaseClient): Promise<NormalizedTaskWithSchedule> {
  return observeServerOperation(
    {
      domain: TASKS_DOMAIN,
      operation: "schedule_for_user",
      budgetMs: 3000,
      context: {
        userId,
        taskTitle: payload.task.title,
        scheduleType: payload.schedule.type,
      },
    },
    async () => {
      const supabase = client ?? getSupabaseAdminClient();
      const action = parseTaskAction(payload.task.action);
      const scheduleDefinition = payload.schedule;
      const nextRunAt = computeInitialNextRunAt(scheduleDefinition);
      const notificationChannels = payload.task.notificationChannels?.length
        ? payload.task.notificationChannels
        : ["in_app"];

      const baseInputs = {
        ...(payload.task.inputs ?? {}),
        schedule: scheduleDefinition,
      };

      const { data: insertedTask, error: insertError } = await supabase
        .from("agent_tasks")
        .insert({
          id: randomUUID(),
          user_id: userId,
          title: payload.task.title,
          description: payload.task.description ?? null,
          agent_identifier: payload.task.agent ?? null,
          team_identifier: payload.task.team ?? null,
          kind: payload.task.kind ?? null,
          status: "set",
          action_type: action.type,
          action_payload: action,
          notification_channels: notificationChannels,
          inputs: baseInputs,
          metadata: {
            ...(payload.task.inputs ?? {}),
            action,
            notificationChannels,
          },
          next_run_at: nextRunAt ? nextRunAt.toISOString() : null,
          scheduled_for: nextRunAt ? nextRunAt.toISOString() : null,
          condition_digest: summarizeConditions(scheduleDefinition.conditions ?? []),
        })
        .select("id")
        .single();

      if (insertError || !insertedTask) {
        throw new AppError(insertError?.message ?? "Failed to create task", "INTERNAL_ERROR", 500, true, insertError);
      }

      const taskId = insertedTask.id as string;

      try {
        await upsertTaskScheduleAndConditions(supabase, taskId, scheduleDefinition, nextRunAt);

        if (scheduleDefinition.type === "future" || scheduleDefinition.type === "loop") {
          const expression = buildScheduleExpression(scheduleDefinition);
          if (expression) {
            await createSchedule({
              taskId,
              scheduleExpression: expression,
              payload: { taskId },
              startDate: scheduleDefinition.type === "loop" && scheduleDefinition.recurrence?.startAt
                ? new Date(scheduleDefinition.recurrence.startAt)
                : undefined,
              timezone: scheduleDefinition.recurrence?.timezone,
            });
          }
        }
      } catch (error) {
        await supabase.from("agent_tasks").delete().eq("id", taskId);
        try {
          await deleteSchedule(taskId);
        } catch {
          // Best-effort cleanup only.
        }
        throw error;
      }

      const row = await fetchTaskById(taskId);
      if (!row) {
        throw new AppError("Failed to load created task", "INTERNAL_ERROR");
      }
      return mapRowToNormalizedTask(row);
    },
  );
}

export async function cancelTaskForUser(userId: string, taskId: string, client?: SupabaseClient): Promise<boolean> {
  return observeServerOperation(
    {
      domain: TASKS_DOMAIN,
      operation: "cancel_for_user",
      budgetMs: 1500,
      context: { userId, taskId },
    },
    async () => {
      const supabase = client ?? getSupabaseAdminClient();
      const { error } = await supabase
        .from("agent_tasks")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", taskId)
        .eq("user_id", userId);

      if (!error) {
        try {
          await deleteSchedule(taskId);
        } catch (scheduleError) {
          logger.error(
            { domain: TASKS_DOMAIN, operation: "cancel_delete_schedule", taskId, error: scheduleError },
            "failed to delete aws schedule for task",
          );
        }
      }

      return !error;
    },
  );
}

export async function updateTaskStatusForUser(
  userId: string,
  taskId: string,
  status: TaskStatusType,
  extra: Partial<AgentTaskRow> = {},
  client?: SupabaseClient,
): Promise<boolean> {
  const supabase = client ?? getSupabaseAdminClient();
  const updates = {
    status,
    ...extra,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("agent_tasks").update(updates).eq("id", taskId).eq("user_id", userId);
  return !error;
}

export async function pauseTaskForUser(userId: string, taskId: string, client?: SupabaseClient): Promise<boolean> {
  return updateTaskStatusForUser(userId, taskId, "paused", {}, client);
}

export async function resumeTaskForUser(userId: string, taskId: string, client?: SupabaseClient): Promise<boolean> {
  const row = await fetchTaskById(taskId, client);
  if (!row || row.user_id !== userId) {
    return false;
  }
  const schedule = parseScheduleRow(row.task_schedules);
  const nextRunAt = computeInitialNextRunAt(schedule ?? { type: "short_term", offsetMs: 60_000 });
  return updateTaskStatusForUser(userId, taskId, "set", {
    next_run_at: nextRunAt ? nextRunAt.toISOString() : null,
  } as Partial<AgentTaskRow>, client);
}

export async function runTaskNowForUser(userId: string, taskId: string, client?: SupabaseClient): Promise<boolean> {
  return observeServerOperation(
    {
      domain: TASKS_DOMAIN,
      operation: "run_now_for_user",
      budgetMs: 1500,
      context: { userId, taskId },
    },
    async () => {
      const supabase = client ?? getSupabaseAdminClient();
      const now = new Date().toISOString();
      const runId = randomUUID();

      const { error: runError } = await supabase.from("task_runs").insert({
        id: runId,
        task_id: taskId,
        status: "queued",
        queued_at: now,
        trigger_type: "manual",
        action_type: "unknown",
      });

      if (runError) {
        logger.error(
          { domain: TASKS_DOMAIN, operation: "run_now_insert_run", taskId, userId, error: runError },
          "failed to create task run",
        );
        return false;
      }

      await updateTaskStatusForUser(userId, taskId, "queued", {
        next_run_at: now,
        scheduled_for: now,
      } as Partial<AgentTaskRow>);

      await enqueueTaskJob({
        runId,
        taskId,
        userId,
        triggerType: "manual",
        priority: 0,
      });

      return true;
    },
  );
}

export async function fetchTaskHistoryForUser(
  userId: string,
  options: { limit?: number; offset?: number } = {},
  client?: SupabaseClient,
): Promise<TaskResult[]> {
  const supabase = client ?? getSupabaseAdminClient();
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  const to = offset + limit - 1;

  const { data, error } = await supabase
    .from("task_runs")
    .select("*, task_results(*), agent_tasks!inner(id,user_id)")
    .eq("agent_tasks.user_id", userId)
    .order("queued_at", { ascending: false })
    .range(offset, to);

  if (error) {
    if (!isMissingRelationError(error)) {
      throw new AppError(`Failed to load task history: ${error.message}`, "INTERNAL_ERROR", 500, true, error);
    }

    logger.warn(
      {
        domain: TASKS_DOMAIN,
        operation: "fetch_history_fallback",
        userId,
        ...toSupabaseLogContext(error),
      },
      "task history fallback applied",
    );

    const { data: taskRows, error: taskError } = await supabase
      .from("agent_tasks")
      .select("id")
      .eq("user_id", userId);

    if (taskError) {
      throw new AppError(
        `Failed to load task history: ${taskError.message}`,
        "INTERNAL_ERROR",
        500,
        true,
        taskError,
      );
    }

    const taskIds = ((taskRows ?? []) as Array<{ id: string }>)
      .map((row) => row.id)
      .filter((id) => typeof id === "string" && id.length > 0);

    if (taskIds.length === 0) {
      return [];
    }

    const { data: runRows, error: runError } = await supabase
      .from("task_runs")
      .select("*")
      .in("task_id", taskIds)
      .order("queued_at", { ascending: false })
      .range(offset, to);

    if (runError) {
      throw new AppError(
        `Failed to load task history: ${runError.message}`,
        "INTERNAL_ERROR",
        500,
        true,
        runError,
      );
    }

    const runs = (runRows ?? []) as TaskRunRow[];
    const runIds = runs.map((row) => row.id);
    const { data: results, error: resultsError } = runIds.length
      ? await supabase.from("task_results").select("*").in("run_id", runIds)
      : { data: [], error: null };

    if (resultsError) {
      logger.warn(
        {
          domain: TASKS_DOMAIN,
          operation: "fetch_history_results_fallback",
          userId,
          ...toSupabaseLogContext(resultsError),
        },
        "task history result fallback failed",
      );
    }

    const resultByRunId = new Map(
      (((results ?? []) as TaskResultRow[]).map((row) => [row.run_id, row])),
    );

    return runs.map((row) =>
      mapRunToTaskResult({
        ...row,
        task_results: resultByRunId.get(row.id) ?? null,
      }),
    );
  }

  const rows = (data ?? []) as Array<TaskRunRow & { task_results?: TaskResultRow | null }>;
  return rows.map((row) => mapRunToTaskResult(row));
}

export type TaskRunDetail = {
  id: string;
  status: TaskRunRow["status"];
  triggerType: TaskRunRow["trigger_type"];
  startedAt: string | null;
  completedAt: string | null;
  summary: string | null;
  error: JsonObject | null;
  output: JsonObject | null;
  renderHint: string | null;
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    scheduleSummary: string | null;
  };
  events: TaskRunEventRow[];
};

export async function fetchTaskRunDetailForUser(userId: string, runId: string, client?: SupabaseClient): Promise<TaskRunDetail> {
  const supabase = client ?? getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("task_runs")
    .select("*, task_results(*), task_run_events(*), agent_tasks!inner(*, task_schedules(*))")
    .eq("id", runId)
    .eq("agent_tasks.user_id", userId)
    .single();

  if (error && isMissingRelationError(error)) {
    const { data: runData, error: runError } = await supabase
      .from("task_runs")
      .select("*")
      .eq("id", runId)
      .single();

    if (runError || !runData) {
      throw new NotFoundError(runError?.message ?? "Task run not found", runError);
    }

    const normalizedTask = await getTaskForUser(userId, runData.task_id, client);
    if (!normalizedTask) {
      throw new NotFoundError("Task run not found");
    }

    const [{ data: events }, { data: result }] = await Promise.all([
      supabase
        .from("task_run_events")
        .select("*")
        .eq("run_id", runId)
        .order("created_at", { ascending: true }),
      supabase
        .from("task_results")
        .select("*")
        .eq("run_id", runId)
        .maybeSingle(),
    ]);

    return {
      id: runData.id,
      status: runData.status,
      triggerType: runData.trigger_type,
      startedAt: runData.started_at,
      completedAt: runData.completed_at,
      summary: runData.result_preview ?? normalizedTask.lastSummary ?? null,
      error: runData.error ?? null,
      output: ((result as TaskResultRow | null) ?? null)?.output ?? null,
      renderHint: ((result as TaskResultRow | null) ?? null)?.render_hint ?? null,
      task: {
        id: normalizedTask.id,
        title: normalizedTask.title,
        description: normalizedTask.description,
        status: normalizedTask.status,
        scheduleSummary: describeTaskSchedule(normalizedTask),
      },
      events: (events ?? []) as TaskRunEventRow[],
    };
  }

  if (error || !data) {
    throw new NotFoundError(error?.message ?? "Task run not found", error);
  }

  const taskRow = data.agent_tasks as AgentTaskRow | null;
  if (!taskRow) {
    throw new AppError("Linked task missing", "INTERNAL_ERROR");
  }

  const normalized = mapRowToNormalizedTask(taskRow);
  const events = (data.task_run_events ?? []) as TaskRunEventRow[];
  const result = (data.task_results ?? null) as TaskResultRow | null;

  return {
    id: data.id,
    status: data.status,
    triggerType: data.trigger_type,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    summary: data.result_preview ?? normalized.lastSummary ?? null,
    error: data.error ?? null,
    output: result?.output ?? null,
    renderHint: result?.render_hint ?? null,
    task: {
      id: normalized.id,
      title: normalized.title,
      description: normalized.description,
      status: normalized.status,
      scheduleSummary: describeTaskSchedule(normalized),
    },
    events,
  };
}

export async function getTaskForUser(userId: string, taskId: string, client?: SupabaseClient): Promise<NormalizedTaskWithSchedule | null> {
  const supabase = client ?? getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_tasks")
    .select(TASK_SELECT_WITH_RELATIONS)
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();
  if (error && isMissingRelationError(error)) {
    const { data: baseData, error: baseError } = await supabase
      .from("agent_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", userId)
      .single();

    if (baseError || !baseData) {
      return null;
    }

    const [hydrated] = await hydrateTaskRowsWithoutEmbeddedRelations(
      supabase,
      [baseData as AgentTaskRow],
    );
    return hydrated ? mapRowToNormalizedTask(hydrated) : null;
  }
  if (error || !data) {
    return null;
  }
  return mapRowToNormalizedTask(data as AgentTaskRow);
}

export type TaskUpdateInput = {
  title?: string;
  description?: string | null;
  agent?: string | null;
  team?: string | null;
  kind?: string | null;
  schedule?: TaskSchedule;
  action?: TaskActionInput;
  notificationChannels?: NotificationChannel[];
};

export async function updateTaskDefinitionForUser(
  userId: string,
  taskId: string,
  updates: TaskUpdateInput,
  client?: SupabaseClient,
): Promise<NormalizedTaskWithSchedule> {
  return observeServerOperation(
    {
      domain: TASKS_DOMAIN,
      operation: "update_definition",
      budgetMs: 3000,
      context: { userId, taskId },
    },
    async () => {
      const supabase = client ?? getSupabaseAdminClient();
      const existing = await getTaskForUser(userId, taskId, client);
      if (!existing) {
        throw new NotFoundError("Task not found");
      }

      const nextAction = updates.action ? parseTaskAction(updates.action) : parseTaskAction(existing.action);
      const nextSchedule = updates.schedule ?? existing.schedule ?? { type: "future", runAt: existing.scheduledFor ?? undefined };
      const nextChannels = updates.notificationChannels ?? (existing.metadata?.notificationChannels as NotificationChannel[]) ?? ["in_app"];

      const nextInputs = {
        ...(existing.inputs ?? {}),
        schedule: nextSchedule,
      };

      const nextMetadata = {
        ...(existing.metadata ?? {}),
        action: nextAction,
        notificationChannels: nextChannels,
      };

      const { error } = await supabase
        .from("agent_tasks")
        .update({
          title: updates.title ?? existing.title,
          description: "description" in updates ? updates.description : existing.description,
          agent_identifier: "agent" in updates ? updates.agent : existing.agent,
          team_identifier: "team" in updates ? updates.team : existing.team,
          kind: "kind" in updates ? updates.kind : existing.kind,
          action_type: nextAction.type,
          action_payload: nextAction,
          notification_channels: nextChannels,
          inputs: nextInputs,
          metadata: nextMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId)
        .eq("user_id", userId);

      if (error) {
        throw new AppError(`Failed to update task: ${error.message}`, "INTERNAL_ERROR", 500, true, error);
      }

      const nextRunAt = computeInitialNextRunAt(nextSchedule);
      await upsertTaskScheduleAndConditions(supabase, taskId, nextSchedule, nextRunAt);

      if (nextSchedule.type === "future" || nextSchedule.type === "loop") {
        try {
          await deleteSchedule(taskId);

          const expression = buildScheduleExpression(nextSchedule);
          if (expression) {
            await createSchedule({
              taskId,
              scheduleExpression: expression,
              payload: { taskId },
              startDate: nextSchedule.type === "loop" && nextSchedule.recurrence?.startAt
                ? new Date(nextSchedule.recurrence.startAt)
                : undefined,
              timezone: nextSchedule.recurrence?.timezone,
            });
          }
        } catch (scheduleError) {
          logger.error(
            { domain: TASKS_DOMAIN, operation: "update_definition_schedule", taskId, error: scheduleError },
            "failed to update aws schedule for task",
          );
        }
      } else {
        try {
          await deleteSchedule(taskId);
        } catch {
          // Best-effort cleanup only.
        }
      }

      const fresh = await getTaskForUser(userId, taskId);
      if (!fresh) {
        throw new AppError("Failed to reload updated task", "INTERNAL_ERROR");
      }
      return fresh;
    },
  );
}

export async function decideTaskRunForUser(
  userId: string,
  runId: string,
  decision: "approve" | "dismiss",
  note?: string,
  client?: SupabaseClient,
) {
  const supabase = client ?? getSupabaseAdminClient();
  const { data: run, error } = await supabase.from("task_runs").select("*").eq("id", runId).single();
  if (error || !run) {
    throw new NotFoundError("Run not found");
  }

  const task = await getTaskForUser(userId, run.task_id, client);
  if (!task) {
    throw new NotFoundError("Task not found");
  }

  if (run.status !== "requires_action") {
    throw new AppError("Run does not require manual approval", "BAD_REQUEST", 400);
  }

  const now = new Date().toISOString();
  if (decision === "approve") {
    await supabase
      .from("task_runs")
      .update({
        status: "completed",
        completed_at: now,
        error: null,
      })
      .eq("id", runId);

    const nextRun =
      task.schedule && run.trigger_type === "schedule" ? computeNextOccurrence(task.schedule, null) : null;

    await supabase
      .from("agent_tasks")
      .update({
        status: "set",
        next_run_at: nextRun ? nextRun.toISOString() : null,
        last_summary: note ?? "Manual approval recorded",
        last_error: null,
        updated_at: now,
      })
      .eq("id", task.id);

    // Enqueue the task for execution via Redis queue (same path as scheduled tasks)
    await enqueueTaskJob({
      runId: runId,
      taskId: task.id,
      userId: userId,
      triggerType: (run.trigger_type as "schedule" | "condition" | "manual") ?? "manual",
      priority: 0, // Approved runs get highest priority
    });

    return { runId, status: "queued" };
  }

  await supabase
    .from("task_runs")
    .update({
      status: "cancelled",
      completed_at: now,
      error: { message: note ?? "Manual approval dismissed" },
    })
    .eq("id", runId);

  await supabase
    .from("agent_tasks")
    .update({
      status: "failed",
      last_error: note ?? "Manual approval dismissed",
      updated_at: now,
    })
    .eq("id", task.id);

  return { status: "cancelled" };
}

function mapRowToNormalizedTask(row: AgentTaskRow): NormalizedTaskWithSchedule {
  const schedule = parseScheduleRow(row.task_schedules);
  const raw = {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    agent: row.agent_identifier,
    team: row.team_identifier,
    kind: row.kind,
    plan_id: row.plan_id,
    scheduled_for: row.next_run_at ?? row.scheduled_for,
    created_at: row.created_at,
    updated_at: row.updated_at,
    metadata: {
      ...(row.metadata ?? {}),
      action: row.action_payload,
      notificationChannels: row.notification_channels,
    },
    inputs: {
      ...(row.inputs ?? {}),
      schedule,
    },
    progress: row.progress,
    last_summary: row.last_summary,
    last_error: row.last_error,
    horizon: row.horizon,
  };

  const normalized = normalizeTask(raw) as NormalizedTaskWithSchedule;
  normalized.schedule = schedule ?? undefined;
  normalized.action = parseTaskAction(row.action_payload);
  return normalized;
}

function mapRunToTaskResult(row: TaskRunRow & { task_results?: TaskResultRow | null }): TaskResult {
  return {
    id: row.id,
    status: mapRunStatus(row.status),
    type: mapRunType(row.action_type),
    payload: {
      name: row.action_type,
      data: row.action_payload,
    },
    createdAt: row.queued_at,
    completedAt: row.completed_at ?? null,
    error: row.error ? { message: String(row.error?.message ?? JSON.stringify(row.error)) } : null,
    output: row.task_results?.output,
  };
}

function mapRunStatus(status: TaskRunRow["status"]): TaskStatus {
  switch (status) {
    case "queued":
      return TaskStatus.QUEUED;
    case "started":
    case "in_progress":
      return TaskStatus.EXECUTING;
    case "requires_action":
      return TaskStatus.REQUIRES_ACTION;
    case "completed":
      return TaskStatus.COMPLETED;
    case "cancelled":
      return TaskStatus.CANCELLED;
    case "failed":
    default:
      return TaskStatus.FAILED;
  }
}

function mapRunType(actionType: string): TaskType {
  switch (actionType) {
    case "news_digest":
      return TaskType.NEWS_DIGEST;
    case "dex_trade":
      return TaskType.DEX_TRADE;
    default:
      return TaskType.CHAIN;
  }
}

async function upsertTaskScheduleAndConditions(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  taskId: string,
  schedule: TaskSchedule,
  nextRunAt: Date | null,
) {
  const summary = describeSchedule(schedule);
  const { error: scheduleError } = await supabase.from("task_schedules").upsert({
    task_id: taskId,
    schedule_type: schedule.type,
    timezone: schedule.recurrence?.timezone ?? "UTC",
    run_at: schedule.runAt ?? (nextRunAt ? nextRunAt.toISOString() : null),
    offset_ms: schedule.offsetMs ?? null,
    long_term_start: schedule.longTermStart ?? null,
    recurrence: schedule.recurrence ?? null,
    summary,
    definition: schedule,
  });
  if (scheduleError) {
    throw new AppError(scheduleError.message, "INTERNAL_ERROR", 500, true, scheduleError);
  }

  await supabase.from("task_conditions").delete().eq("task_id", taskId);
  const conditions = extractScheduleConditions(schedule);
  if (conditions.length) {
    const insertPayload = conditions.map((condition) => ({
      task_id: taskId,
      condition_type: condition.type,
      summary: summarizeSingleCondition(condition),
      definition: condition,
    }));
    const { error: conditionError } = await supabase.from("task_conditions").insert(insertPayload);
    if (conditionError) {
      throw new AppError(conditionError.message, "INTERNAL_ERROR", 500, true, conditionError);
    }
  }
}

function describeSchedule(schedule: TaskSchedule | null): string | null {
  if (!schedule) {
    return null;
  }
  return describeTaskSchedule({
    id: "schedule",
    title: "task",
    description: null,
    status: "scheduled",
    rawStatus: "scheduled",
    scheduledFor: schedule.runAt ?? null,
    createdAt: null,
    updatedAt: null,
    progress: null,
    inputs: { schedule },
    metadata: {},
    agent: null,
    team: null,
    kind: null,
    planId: null,
    horizon: null,
    lastSummary: null,
    lastError: null,
  } as NormalizedTask);
}

function summarizeConditions(conditions: TaskScheduleCondition[]): string | null {
  if (!conditions.length) {
    return null;
  }
  return conditions.map((condition) => summarizeSingleCondition(condition)).join(" • ");
}

function summarizeSingleCondition(condition: TaskScheduleCondition): string {
  switch (condition.type) {
    case "market_price_percent":
      return `${condition.asset ?? condition.symbol ?? "asset"} ${condition.direction ?? "above"} ${condition.thresholdPercent ?? 0
        }%`;
    case "market_price_amount":
      return `${condition.asset ?? condition.symbol ?? "asset"} ${condition.direction ?? "above"} $${condition.thresholdValue ?? 0}`;
    case "trade_volume":
      return `${condition.asset ?? condition.symbol ?? "asset"} volume ${condition.direction ?? "above"} ${condition.thresholdValue ?? 0
        }`;
    case "news":
      return `News contains "${condition.keyword ?? ""}"`;
    default:
      return condition.type;
  }
}


function buildScheduleExpression(schedule: TaskSchedule): string | null {
  if (schedule.type === "future" && schedule.runAt) {
    // Format: at(yyyy-mm-ddThh:mm:ss)
    // Ensure we strip milliseconds if present as AWS might be picky, though ISO is usually fine.
    // AWS Scheduler expects: at(yyyy-mm-ddThh:mm:ss)
    return `at(${schedule.runAt.split(".")[0]})`;
  }

  if (schedule.type === "loop" && schedule.recurrence) {
    const { frequency, interval = 1 } = schedule.recurrence;
    // Format: rate(value unit) or cron(fields)
    // Simple rate for now
    switch (frequency) {
      case "hourly":
        return `rate(${interval} ${interval === 1 ? "hour" : "hours"})`;
      case "daily":
        return `rate(${interval} ${interval === 1 ? "day" : "days"})`;
      case "weekly":
        return `rate(${interval * 7} days)`; // AWS rate doesn't support weeks directly in all contexts, but days works
      case "monthly":
        // Rate doesn't support months. We'd need cron.
        // cron(0 0 1 * ? *) -> Run at 00:00 on day 1 of every month
        // This is complex to map generic "monthly" to cron without more details.
        // For MVP, let's use a 30-day rate or fallback to cron if we can construct it.
        return `rate(${interval * 30} days)`;
      default:
        return null;
    }
  }

  return null;
}
