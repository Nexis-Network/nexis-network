import { config } from "dotenv";

config({ path: ".env.local" });

import { queueConfig } from "@/server/queues/config";
import { runQueueWorkerLoop } from "@/server/queues/worker-runtime";
import { isRedisExternalConfigured } from "@/server/services/redis";

function failIfMisconfigured() {
  if (queueConfig.backend === "inline") {
    throw new Error(
      "QUEUE_BACKEND=inline does not require a worker. Configure Redis or SQS before starting worker:queue.",
    );
  }

  if (queueConfig.backend === "redis" && !isRedisExternalConfigured) {
    throw new Error(
      "Redis queue backend requires an external Redis connection before starting worker:queue.",
    );
  }

  if (queueConfig.backend === "sqs" && !queueConfig.sqsQueueUrl) {
    throw new Error(
      "SQS queue backend requires SQS_QUEUE_URL before starting worker:queue.",
    );
  }
}

async function main() {
  failIfMisconfigured();

  console.log(
    `[queue-worker] starting backend=${queueConfig.backend} redisKey=${queueConfig.redisQueueKey}`,
  );

  const controller = new AbortController();

  const stop = () => {
    if (!controller.signal.aborted) {
      console.log("[queue-worker] shutting down");
      controller.abort();
    }
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  await runQueueWorkerLoop(controller.signal);

  console.log("[queue-worker] stopped");
}

main().catch((error) => {
  console.error("[queue-worker] failed to start", error);
  process.exit(1);
});
