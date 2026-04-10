import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { isRedisExternalConfigured, redis } from "@/server/services/redis";
import { queueConfig } from "./config";
import { processRawJob } from "./enqueue";


import { logger } from '@/lib/logger';
const POLL_WAIT_SECONDS = 10;
const BATCH_SIZE = 5;

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runRedisWorkerLoop(signal?: AbortSignal) {
  if (!isRedisExternalConfigured || (!redis.brpop && !redis.lpop)) {
    throw new Error("External Redis queue is not configured");
  }

  while (!signal?.aborted) {
    const raw = redis.brpop
      ? await redis
          .brpop(
            queueConfig.redisQueueKey,
            queueConfig.redisBlockTimeoutSeconds,
          )
          .catch(() => null)
      : await redis.lpop?.(queueConfig.redisQueueKey).catch(() => null);

    if (!raw) {
      if (!redis.brpop) {
        await sleep(queueConfig.redisPollIntervalMs);
      }
      continue;
    }

    try {
      await processRawJob(raw);
    } catch (error) {
      logger.error("queue_worker_job_failed", {
        backend: "redis",
        queue: queueConfig.redisQueueKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export async function runSqsWorkerLoop(signal?: AbortSignal) {
  if (!queueConfig.sqsQueueUrl) {
    throw new Error("SQS queue URL not configured");
  }
  const client = new SQSClient({ region: queueConfig.sqsRegion });

  while (!signal?.aborted) {
    const messages = await client
      .send(
        new ReceiveMessageCommand({
          QueueUrl: queueConfig.sqsQueueUrl,
          WaitTimeSeconds: POLL_WAIT_SECONDS,
          MaxNumberOfMessages: BATCH_SIZE,
          VisibilityTimeout: 30,
        }),
      )
      .then((r) => r.Messages || [])
      .catch(() => []);

    if (!messages.length) {
      continue;
    }

    for (const msg of messages) {
      if (!msg.Body || !msg.ReceiptHandle) continue;
      try {
        await processRawJob(msg.Body);
        await client.send(
          new DeleteMessageCommand({
            QueueUrl: queueConfig.sqsQueueUrl,
            ReceiptHandle: msg.ReceiptHandle,
          }),
        );
      } catch (error) {
        // Let visibility timeout expire; consider DLQ for real deployments
        logger.error("queue_worker_job_failed", {
          messageId: msg.MessageId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

export async function runQueueWorkerLoop(signal?: AbortSignal) {
  if (queueConfig.backend === "redis") {
    await runRedisWorkerLoop(signal);
    return;
  }

  if (queueConfig.backend === "sqs") {
    await runSqsWorkerLoop(signal);
    return;
  }

  throw new Error("Inline queue backend does not require a worker loop");
}
