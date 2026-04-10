import { apiResponse } from "@/lib/api-platform";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { dequeueTaskJobs, requeueTaskJob, type TaskQueueJob } from "@/server/tasks/queue";
import { parseTaskAction } from "@/modules/tasks/action-schema";
import { executeTaskAction } from "@/server/tasks/executor";
import { parseScheduleRow, computeNextOccurrence } from "@/server/tasks/schedule";
import type { AgentTaskRow, TaskRunRow } from "@/server/tasks/types";


import { logger } from '@/lib/logger';
const DEFAULT_BATCH = Number(process.env.NEX_TASK_WORKER_BATCH ?? 5);
const WORKER_AUTH_HEADER = "x-cron-key";


export async function POST(request: Request) {
  return handleWorker(request);
}

export async function GET(request: Request) {
  return handleWorker(request);
}

async function handleWorker(request: Request) {
  // Worker route MUST use a dedicated key separate from the dispatch key.
  // Fallback to NEX_TASK_DISPATCH_KEY is kept for backward-compat but logs a deprecation warning.
  const dedicatedKey = process.env.NEX_TASK_RUN_KEY;
  const fallbackKey = process.env.NEX_TASK_DISPATCH_KEY;
  const workerKey = dedicatedKey ?? fallbackKey;
  if (!workerKey) {
    logger.error("[tasks][worker] NEX_TASK_RUN_KEY env var is not set — rejecting request");
    return apiResponse.serviceUnavailable("service_misconfigured");
  }
  if (!dedicatedKey && fallbackKey) {
    logger.warn(
      "[tasks][worker] NEX_TASK_RUN_KEY is not set — falling back to NEX_TASK_DISPATCH_KEY. " +
      "Set a separate NEX_TASK_RUN_KEY for proper secret separation between dispatch and run workers.",
    );
  }
  if (dedicatedKey && fallbackKey && dedicatedKey === fallbackKey) {
    logger.warn(
      "[tasks][worker] NEX_TASK_RUN_KEY and NEX_TASK_DISPATCH_KEY are identical. " +
      "Use distinct secrets for dispatch vs run authentication.",
    );
  }
  const provided = request.headers.get(WORKER_AUTH_HEADER);
  if (!provided || provided !== workerKey) {
    return apiResponse.unauthorized("unauthorized");
  }

  const supabase = getSupabaseAdminClient();
  const jobs = await dequeueTaskJobs(DEFAULT_BATCH);
  if (jobs.length === 0) {
    return apiResponse.success({ ok: true, processed: 0, message: "queue empty" });
  }

  const summary = {
    processed: 0,
    completed: 0,
    failed: 0,
    requiresAction: 0,
    errors: 0,
  };

  for (const job of jobs) {
    try {
      const handled = await processJob(supabase, job);
      summary.processed += Number(handled);
      if (handled?.status === "completed") {
        summary.completed += 1;
      } else if (handled?.status === "requires_action") {
        summary.requiresAction += 1;
      } else if (handled?.status === "failed") {
        summary.failed += 1;
      }
    } catch (error) {
      summary.errors += 1;
      logger.error("[tasks][worker] job failed", { jobId: job.id, runId: job.runId, error });
      await requeueTaskJob(job);
    }
  }

  return apiResponse.success({ ok: true, ...summary });
}

async function processJob(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  job: TaskQueueJob,
): Promise<{ status: "completed" | "failed" | "requires_action" } | null> {
  const run = await fetchRunRecord(supabase, job.runId);
  if (!run) {
    logger.warn("[tasks][worker] missing run record", { jobId: job.id, runId: job.runId });
    return null;
  }
  const task = await fetchTaskRecord(supabase, run.task_id);
  if (!task) {
    logger.warn("[tasks][worker] missing task record", { taskId: run.task_id });
    return null;
  }

  try {
    const startedAt = new Date().toISOString();
    await supabase.from("task_runs").update({ status: "in_progress", started_at: startedAt }).eq("id", run.id);

    const action = parseTaskAction(run.action_payload ?? task.action_payload);
    const execution = await executeTaskAction(task, action);
    const completedAt = new Date().toISOString();

    await supabase
      .from("task_runs")
      .update({
        status: execution.status,
        completed_at: completedAt,
        result_preview: execution.summary ?? null,
        error: execution.error ? { message: execution.error } : null,
        metrics: execution.output?.metrics ?? null,
      })
      .eq("id", run.id);

    if (execution.output) {
      await supabase
        .from("task_results")
        .upsert({
          run_id: run.id,
          output: execution.output,
          render_hint: execution.renderHint ?? null,
        });
    }

    await finalizeTaskAfterRun(supabase, task, completedAt, execution);

    return { status: execution.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase
      .from("task_runs")
      .update({
        status: "failed",
        error: { message },
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    await supabase
      .from("agent_tasks")
      .update({
        status: "failed",
        last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);
    throw error;
  }
}

async function fetchRunRecord(supabase: ReturnType<typeof getSupabaseAdminClient>, runId: string) {
  const { data, error } = await supabase.from("task_runs").select("*").eq("id", runId).single();
  if (error || !data) {
    return null;
  }
  return data as TaskRunRow;
}

async function fetchTaskRecord(supabase: ReturnType<typeof getSupabaseAdminClient>, taskId: string) {
  const { data, error } = await supabase
    .from("agent_tasks")
    .select("*, task_schedules(*), task_conditions(*)")
    .eq("id", taskId)
    .single();
  if (error || !data) {
    return null;
  }
  return data as AgentTaskRow;
}

async function finalizeTaskAfterRun(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  task: AgentTaskRow,
  completedAt: string,
  execution: Awaited<ReturnType<typeof executeTaskAction>>,
) {
  const schedule = parseScheduleRow(task.task_schedules);
  if (execution.status === "requires_action") {
    await supabase
      .from("agent_tasks")
      .update({
        status: "requires_action",
        last_summary: execution.summary ?? task.last_summary,
        last_error: execution.error ?? task.last_error,
        last_run_at: completedAt,
        next_run_at: null,
        last_result_at: completedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);
    return;
  }

  const nextRun =
    schedule && execution.status === "completed"
      ? computeNextOccurrence(schedule, completedAt ? new Date(completedAt) : null)
      : null;

  await supabase
    .from("agent_tasks")
    .update({
      status: execution.status === "completed" ? "set" : "failed",
      next_run_at: nextRun ? nextRun.toISOString() : null,
      last_summary: execution.summary ?? task.last_summary,
      last_error: execution.error ?? null,
      last_run_at: completedAt,
      last_result_at: completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", task.id);
}

