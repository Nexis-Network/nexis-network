import { randomUUID } from "crypto";

import { apiResponse } from "@/lib/api-platform";
import { redis } from "@/server/services/redis";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { evaluateTaskConditions } from "@/server/tasks/conditions";
import { parseScheduleRow } from "@/server/tasks/schedule";
import type { AgentTaskRow } from "@/server/tasks/types";
import { enqueueTaskJob } from "@/server/tasks/queue";
import { createTaskRunRecord, markTaskQueued, rescheduleAfterConditionsFail } from "@/server/tasks/run-control";


import { logger } from '@/lib/logger';
const WATCHER_LOCK_KEY = "tasks:watchers:conditions:v1";
const WATCHER_BATCH = Number(process.env.NEX_TASK_WATCHER_BATCH ?? 5);


export async function POST(request: Request) {
  return runWatcher(request);
}

export async function GET(request: Request) {
  return runWatcher(request);
}

async function runWatcher(request: Request) {
  const dispatchKey = process.env.NEX_TASK_DISPATCH_KEY;
  if (!dispatchKey) {
    logger.error("[tasks][condition-watcher] NEX_TASK_DISPATCH_KEY env var is not set — rejecting request");
    return apiResponse.serviceUnavailable("service_misconfigured");
  }
  const provided = request.headers.get("x-cron-key");
  if (!provided || provided !== dispatchKey) {
    return apiResponse.unauthorized("unauthorized");
  }

  const lockOwner = randomUUID();
  const acquired = await redis.trySetNx(WATCHER_LOCK_KEY, lockOwner, 20);
  if (!acquired) {
    return apiResponse.success({ ok: true, message: "condition watcher busy" });
  }

  const supabase = getSupabaseAdminClient();
  try {
    const tasks = await fetchConditionalTasks(supabase, WATCHER_BATCH);
    const triggered: Array<{ taskId: string; triggerId: string | null }> = [];
    const skipped: Array<{ taskId: string; reason: string }> = [];

    for (const task of tasks) {
      const schedule = parseScheduleRow(task.task_schedules);
      const evaluation = await evaluateTaskConditions(task.task_conditions ?? []);
      if (!evaluation.passed) {
        await rescheduleAfterConditionsFail(supabase, task, schedule, evaluation);
        skipped.push({
          taskId: task.id,
          reason: evaluation.details.map((detail) => detail.reason ?? detail.type).join("; "),
        });
        continue;
      }

      const triggerId = await createConditionTrigger(supabase, task, evaluation);
      const runId = await createTaskRunRecord(supabase, task, {
        triggerType: "condition",
        triggerId,
        payload: { evaluation },
      });
      await enqueueTaskJob({
        runId,
        taskId: task.id,
        userId: task.user_id,
        triggerType: "condition",
        priority: task.priority,
      });
      await markTaskQueued(supabase, task.id);
      triggered.push({ taskId: task.id, triggerId });
    }

    return apiResponse.success({ ok: true, triggered, skipped });
  } catch (error) {
    logger.error("[tasks][condition-watcher] error", error);
    return apiResponse.internalError(
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await redis.tryReleaseLock(WATCHER_LOCK_KEY, lockOwner);
  }
}

async function fetchConditionalTasks(supabase: ReturnType<typeof getSupabaseAdminClient>, limit: number) {
  const { data, error } = await supabase
    .from("agent_tasks")
    .select("*, task_schedules(*), task_conditions(*)")
    .in("status", ["set", "scheduled"])
    .eq("task_schedules.schedule_type", "conditional")
    .limit(limit);
  if (error) {
    throw new Error(`Failed to load conditional tasks: ${error.message}`);
  }
  return (data ?? []) as AgentTaskRow[];
}

async function createConditionTrigger(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  task: AgentTaskRow,
  evaluation: Awaited<ReturnType<typeof evaluateTaskConditions>>,
) {
  const { data, error } = await supabase
    .from("task_triggers")
    .insert({
      task_id: task.id,
      trigger_type: "condition",
      status: "queued",
      payload: { evaluation },
    })
    .select("id")
    .single();
  if (error) {
    logger.warn("[tasks][condition-watcher] failed to create trigger", { taskId: task.id, error });
    return null;
  }
  return (data?.id as string) ?? null;
}

