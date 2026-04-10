import "server-only";

import { randomUUID } from "crypto";
import { z } from "zod";

import { redis, isRedisConfigured } from "@/server/services/redis";
import { logger } from "@/lib/logger";
import { observeServerOperation } from "@/server/observability/operations";

const TASK_QUEUE_KEY = process.env.NEX_TASK_QUEUE_KEY ?? "queue:agent-tasks";
const TASK_QUEUE_DOMAIN = "tasks_queue";

type EnqueuePayload = {
  runId: string;
  taskId: string;
  userId: string;
  triggerType: "schedule" | "condition" | "manual";
  priority?: number;
};

export type TaskQueueJob = EnqueuePayload & {
  id: string;
  enqueuedAt: string;
  attempts: number;
};

const taskQueueJobSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().min(1),
  taskId: z.string().min(1),
  userId: z.string().min(1),
  triggerType: z.enum(["schedule", "condition", "manual"]),
  priority: z.number().int().nonnegative(),
  enqueuedAt: z.string().datetime(),
  attempts: z.number().int().nonnegative(),
});

export async function enqueueTaskJob(payload: EnqueuePayload): Promise<TaskQueueJob | null> {
  return observeServerOperation(
    {
      domain: TASK_QUEUE_DOMAIN,
      operation: "enqueue",
      budgetMs: 300,
      context: {
        taskId: payload.taskId,
        runId: payload.runId,
        triggerType: payload.triggerType,
      },
    },
    async () => {
      if (!isRedisConfigured || !redis.rpush) {
        logger.warn("[tasks][queue] enqueue skipped: redis unavailable");
        return null;
      }

      const job = taskQueueJobSchema.parse({
        id: randomUUID(),
        enqueuedAt: new Date().toISOString(),
        attempts: 0,
        priority: payload.priority ?? 100,
        ...payload,
      });

      await redis.rpush(TASK_QUEUE_KEY, JSON.stringify(job));
      return job;
    },
  );
}

export async function dequeueTaskJobs(limit: number): Promise<TaskQueueJob[]> {
  return observeServerOperation(
    {
      domain: TASK_QUEUE_DOMAIN,
      operation: "dequeue",
      budgetMs: 500,
      context: { limit },
    },
    async () => {
      if (!isRedisConfigured || !redis.lpop) {
        logger.warn("[tasks][queue] dequeue skipped: redis unavailable");
        return [];
      }

      const jobs: TaskQueueJob[] = [];
      for (let i = 0; i < limit; i += 1) {
        const raw = await redis.lpop(TASK_QUEUE_KEY);
        if (!raw) {
          break;
        }
        try {
          const parsed = taskQueueJobSchema.parse(JSON.parse(raw));
          jobs.push(parsed);
        } catch (error) {
          logger.error("[tasks][queue] invalid job payload", { raw, error });
        }
      }
      return jobs;
    },
  );
}

export async function requeueTaskJob(job: TaskQueueJob, maxAttempts = 3): Promise<void> {
  await observeServerOperation(
    {
      domain: TASK_QUEUE_DOMAIN,
      operation: "requeue",
      budgetMs: 300,
      context: {
        jobId: job.id,
        taskId: job.taskId,
        attempts: job.attempts,
        maxAttempts,
      },
    },
    async () => {
      if (job.attempts >= maxAttempts) {
        logger.warn("[tasks][queue] dropping job after max attempts", { jobId: job.id });
        return;
      }
      if (!isRedisConfigured || !redis.rpush) {
        logger.error("[tasks][queue] unable to requeue job; redis unavailable", { jobId: job.id });
        return;
      }
      const payload = taskQueueJobSchema.parse({ ...job, attempts: job.attempts + 1 });
      await redis.rpush(TASK_QUEUE_KEY, JSON.stringify(payload));
    },
  );
}
