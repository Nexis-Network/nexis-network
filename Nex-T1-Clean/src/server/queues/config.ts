import { isRedisExternalConfigured } from "@/server/services/redis";

type QueueBackend = "inline" | "redis" | "sqs";

function hasSqsCredentials(): boolean {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim() ?? "";

  return accessKeyId.length > 0 && secretAccessKey.length > 0;
}

function resolveQueueBackend(): QueueBackend {
  const explicit = (process.env.QUEUE_BACKEND ?? "").trim().toLowerCase();
  if (explicit === "inline" || explicit === "redis" || explicit === "sqs") {
    if (explicit === "inline" && process.env.NODE_ENV === "production") {
      throw new Error(
        "QUEUE_BACKEND=inline is not supported in production. Configure Redis or SQS for async processing.",
      );
    }

    if (
      explicit === "sqs" &&
      ((process.env.SQS_QUEUE_URL ?? "").trim().length === 0 ||
        !hasSqsCredentials()) &&
      isRedisExternalConfigured
    ) {
      return "redis";
    }

    return explicit;
  }

  if (process.env.NODE_ENV === "production") {
    return "redis";
  }

  if (isRedisExternalConfigured) {
    return "redis";
  }

  if ((process.env.SQS_QUEUE_URL ?? "").trim()) {
    return "sqs";
  }

  return "inline";
}

export const queueConfig = {
  backend: resolveQueueBackend(),
  redisQueueKey: process.env.REDIS_QUEUE_KEY?.trim() || "queue:jobs",
  redisBlockTimeoutSeconds: Math.max(
    1,
    Number(process.env.REDIS_QUEUE_BLOCK_TIMEOUT_SECONDS ?? 5),
  ),
  redisPollIntervalMs: Math.max(
    250,
    Number(process.env.REDIS_QUEUE_POLL_INTERVAL_MS ?? 1000),
  ),
  sqsQueueUrl: process.env.SQS_QUEUE_URL?.trim() ?? "",
  sqsRegion:
    process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
};

export const processInline = queueConfig.backend === "inline";
