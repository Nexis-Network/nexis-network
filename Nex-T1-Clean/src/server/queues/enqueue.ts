import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { redis, isRedisExternalConfigured } from "@/server/services/redis";
import { queueConfig, processInline } from "./config";
import {
  deserializeJob,
  runJobInline,
  serializeJob,
  type JobName,
  type JobPayloadMap,
} from "./jobs";

let sqsClient: SQSClient | null = null;

function getSqsClient(): SQSClient {
  if (!sqsClient) {
    sqsClient = new SQSClient({ region: queueConfig.sqsRegion });
  }
  return sqsClient;
}

export async function enqueueJob<K extends JobName>(
  name: K,
  payload: JobPayloadMap[K],
  options?: { inlineOverride?: boolean },
) {
  const useInline = options?.inlineOverride ?? processInline;

  if (useInline) {
    await runJobInline(name, payload);
    return;
  }

  if (queueConfig.backend === "redis") {
    if (!isRedisExternalConfigured || !redis.rpush) {
      throw new Error(
        "Redis queue backend requires an external Redis instance with list support",
      );
    }

    await redis.rpush(queueConfig.redisQueueKey, serializeJob(name, payload));
    return;
  }

  if (queueConfig.backend === "sqs" && queueConfig.sqsQueueUrl) {
    const client = getSqsClient();
    await client.send(
      new SendMessageCommand({
        QueueUrl: queueConfig.sqsQueueUrl,
        MessageBody: serializeJob(name, payload),
      }),
    );
    return;
  }

  throw new Error(`Queue backend "${queueConfig.backend}" is not fully configured`);
}

// Worker-side helper: process a single raw message body
export async function processRawJob(raw: string) {
  const job = deserializeJob(raw);
  if (!job) return;
  await runJobInline(job.name, job.payload);
}
