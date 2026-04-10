#!/usr/bin/env node
/**
 * Lightweight helper to create (or fetch) an SQS queue and print its URL.
 * Requires AWS creds in the environment with sqs:CreateQueue and sqs:GetQueueUrl.
 *
 * Usage:
 *   AWS_REGION=us-east-1 QUEUE_NAME=nex-t1-queue node scripts/sqs/create-queue.cjs
 *
 * Outputs:
 *   - Queue URL to stdout
 *   - An .env snippet you can copy-paste
 */

const { SQSClient, CreateQueueCommand, GetQueueUrlCommand } = require("@aws-sdk/client-sqs");

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
const QUEUE_NAME = process.env.QUEUE_NAME || "nex-t1-queue";
const IS_FIFO = QUEUE_NAME.endsWith(".fifo");

async function ensureQueue() {
  const client = new SQSClient({ region: REGION });

  // Create (idempotent; succeeds if already exists)
  const createParams = {
    QueueName: QUEUE_NAME,
    Attributes: IS_FIFO
      ? { FifoQueue: "true", ContentBasedDeduplication: "true" }
      : {},
  };

  await client.send(new CreateQueueCommand(createParams));

  // Resolve URL
  const { QueueUrl } = await client.send(
    new GetQueueUrlCommand({ QueueName: QUEUE_NAME }),
  );

  if (!QueueUrl) {
    throw new Error("Failed to resolve QueueUrl");
  }

  console.log(QueueUrl);
  console.log("\n# .env snippet\nQUEUE_BACKEND=sqs");
  console.log(`SQS_QUEUE_URL=${QueueUrl}`);
  console.log(`AWS_REGION=${REGION}`);
  return QueueUrl;
}

ensureQueue().catch((err) => {
  console.error("create-queue failed:", err?.message || err);
  process.exit(1);
});
