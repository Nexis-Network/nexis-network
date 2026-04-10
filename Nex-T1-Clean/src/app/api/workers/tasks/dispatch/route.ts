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
const DISPATCH_LOCK_KEY = "tasks:dispatch:lock:v1";
const DISPATCH_BATCH_SIZE = 3;


export async function POST(request: Request) {
  const dispatchKey = process.env.NEX_TASK_DISPATCH_KEY;
  if (!dispatchKey) {
    logger.error("[tasks][dispatch] NEX_TASK_DISPATCH_KEY env var is not set — rejecting request");
    return apiResponse.serviceUnavailable("service_misconfigured");
  }
  const provided = request.headers.get("x-cron-key");
  if (!provided || provided !== dispatchKey) {
    return apiResponse.unauthorized("unauthorized");
  }

  const lockOwner = randomUUID();
  const acquired = await redis.trySetNx(DISPATCH_LOCK_KEY, lockOwner, 20);
  if (!acquired) {
    return apiResponse.success({ ok: true, message: "dispatcher busy" });
  }

  const supabase = getSupabaseAdminClient();
  try {
    const tasks = await fetchDueTasks(supabase, DISPATCH_BATCH_SIZE);
    const processed = [];
    for (const task of tasks) {
      const result = await processTask(supabase, task);
      processed.push(result);
    }
    return apiResponse.success({ ok: true, processed });
  } catch (error) {
    logger.error("[tasks][dispatch] error", error);
    return apiResponse.internalError(
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await redis.tryReleaseLock(DISPATCH_LOCK_KEY, lockOwner);
  }
}

async function fetchDueTasks(supabase: ReturnType<typeof getSupabaseAdminClient>, limit: number) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("agent_tasks")
    .select("*, task_schedules(*), task_conditions(*)")
    .in("status", ["set", "scheduled", "queued"])
    .lte("next_run_at", nowIso)
    .order("priority", { ascending: true })
    .order("next_run_at", { ascending: true })
    .limit(limit);
  if (error) {
    throw new Error(`Failed to fetch due tasks: ${error.message}`);
  }
  return (data ?? []) as AgentTaskRow[];
}

async function processTask(supabase: ReturnType<typeof getSupabaseAdminClient>, task: AgentTaskRow) {
  const schedule = parseScheduleRow(task.task_schedules);
  const conditions = task.task_conditions ?? [];

  const evaluation = await evaluateTaskConditions(conditions);
  if (!evaluation.passed) {
    await rescheduleAfterConditionsFail(supabase, task, schedule, evaluation);
    return {
      taskId: task.id,
      status: "skipped",
      reason: evaluation.details,
    };
  }

  const runId = await createTaskRunRecord(supabase, task, {
    triggerType: "schedule",
    payload: { evaluation },
  });
  const job = await enqueueTaskJob({
    runId,
    taskId: task.id,
    userId: task.user_id,
    triggerType: "schedule",
    priority: task.priority,
  });
  await markTaskQueued(supabase, task.id);

  return {
    taskId: task.id,
    status: "queued",
    runId,
    jobId: job?.id ?? null,
  };
}


