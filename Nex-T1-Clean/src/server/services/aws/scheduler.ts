import {
  SchedulerClient,
  CreateScheduleCommand,
  DeleteScheduleCommand,
  GetScheduleCommand,
  ListSchedulesCommand,
  type CreateScheduleCommandInput,
} from "@aws-sdk/client-scheduler";
import crypto from "crypto";

import { logger } from "@/lib/logger";
const SCHEDULER_GROUP_NAME = process.env.AWS_SCHEDULER_GROUP_NAME || "default";
const SCHEDULER_ROLE_ARN = process.env.AWS_SCHEDULER_ROLE_ARN;
const TARGET_API_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/run-task`
  : undefined;
const TASK_WEBHOOK_SECRET = process.env.TASK_WEBHOOK_SECRET;

// Initialize the client
const schedulerClient = new SchedulerClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

function signPayload(payload: string, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`${timestamp}.${payload}`);
  const digest = hmac.digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

function getAwsErrorName(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "name" in error
    ? String((error as { name?: unknown }).name)
    : undefined;
}

export type CreateScheduleParams = {
  taskId: string;
  scheduleExpression: string; // "at(yyyy-mm-ddThh:mm:ss)" or "rate(value unit)" or "cron(fields)"
  payload: Record<string, UntypedJson>;
  startDate?: Date;
  endDate?: Date;
  timezone?: string;
};

export async function createSchedule(params: CreateScheduleParams) {
  if (!SCHEDULER_ROLE_ARN) {
    throw new Error("AWS_SCHEDULER_ROLE_ARN is not defined");
  }
  if (!TARGET_API_URL) {
    throw new Error(
      "Target API URL is not defined (NEXT_PUBLIC_APP_URL missing)",
    );
  }
  if (!TASK_WEBHOOK_SECRET) {
    throw new Error("TASK_WEBHOOK_SECRET is not defined");
  }

  const scheduleName = `task-${params.taskId}`;

  const payload = JSON.stringify({
    taskId: params.taskId,
    ...params.payload,
  });

  const signature = signPayload(payload, TASK_WEBHOOK_SECRET);

  const target = {
    Arn: "arn:aws:scheduler:::aws-sdk:httpRequest",
    RoleArn: SCHEDULER_ROLE_ARN,
    HttpParameters: {
      HeaderParameters: {
        "Content-Type": "application/json",
        "x-task-signature": signature, // HMAC signature for verification
      },
      Method: "POST",
      Url: TARGET_API_URL,
    },
    Input: payload,
    RetryPolicy: {
      MaximumEventAgeInSeconds: 3600,
      MaximumRetryAttempts: 3,
    },
  } as unknown as NonNullable<CreateScheduleCommandInput["Target"]>;

  const input: CreateScheduleCommandInput = {
    Name: scheduleName,
    GroupName: SCHEDULER_GROUP_NAME,
    ScheduleExpression: params.scheduleExpression,
    ScheduleExpressionTimezone: params.timezone || "UTC",
    StartDate: params.startDate,
    EndDate: params.endDate,
    Target: target,
    FlexibleTimeWindow: {
      Mode: "OFF",
    },
  };

  try {
    const command = new CreateScheduleCommand(input);
    const response = await schedulerClient.send(command);
    return response.ScheduleArn;
  } catch (error) {
    logger.error("Failed to create schedule:", error);
    throw error;
  }
}

export async function deleteSchedule(taskId: string) {
  const scheduleName = `task-${taskId}`;
  try {
    const command = new DeleteScheduleCommand({
      Name: scheduleName,
      GroupName: SCHEDULER_GROUP_NAME,
    });
    await schedulerClient.send(command);
    return true;
  } catch (error) {
    // If schedule doesn't exist, we consider it a success (idempotent)
    if (getAwsErrorName(error) === "ResourceNotFoundException") {
      return true;
    }
    logger.error("Failed to delete schedule:", error);
    throw error;
  }
}

export async function getSchedule(taskId: string) {
  const scheduleName = `task-${taskId}`;
  try {
    const command = new GetScheduleCommand({
      Name: scheduleName,
      GroupName: SCHEDULER_GROUP_NAME,
    });
    return await schedulerClient.send(command);
  } catch (error) {
    if (getAwsErrorName(error) === "ResourceNotFoundException") {
      return null;
    }
    throw error;
  }
}
export async function listSchedules(maxResults: number = 50) {
  try {
    const command = new ListSchedulesCommand({
      GroupName: SCHEDULER_GROUP_NAME,
      MaxResults: maxResults,
    });
    const response = await schedulerClient.send(command);
    return response.Schedules || [];
  } catch (error) {
    const errorName = getAwsErrorName(error);
    if (
      errorName === "AccessDeniedException" ||
      errorName === "NotAuthorizedException"
    ) {
      logger.warn("AWS Scheduler access denied - skipping schedules list");
      return [];
    }
    logger.error("Failed to list schedules:", error);
    throw error;
  }
}
