/**
 * Task Scheduler Tool
 *
 * Domain: AI Tools - Task Management
 * Responsibility: Schedule and manage user tasks (reminders, recurring actions, goals)
 * Notes: Modernized to use AI SDK 5.0 native tool pattern with JSON Schema.
 */

import {
  createTool,
  createToolSchema,
  stringProp,
  integerProp,
  enumProp,
  arrayProp,
  objectProp,
} from "./create-tool";
import { resolveAuthContext } from "./auth-context";
import type { JSONSchema7 } from "json-schema";
import type { DexVenue, TaskActionInput } from "@/modules/tasks/action-schema";

import { logger } from "@/lib/logger";
// ============================================================================
// TYPES
// ============================================================================

interface TaskSchedulerInput {
  action: "create" | "list" | "update" | "cancel";
  taskId?: string;
  task?: {
    title: string;
    description?: string;
    kind?: string;
    schedule?: {
      type?: "future" | "short_term" | "long_term" | "conditional" | "loop";
      runAt?: string;
      offsetMs?: number;
      horizons?: string[];
      longTermStart?: string;
      recurrence?: {
        frequency: "hourly" | "daily" | "weekly" | "monthly";
        interval?: number;
        startAt?: string;
        timezone?: string;
        weekdays?: Array<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun">;
      };
      summary?: string;
    };
    notificationChannels?: Array<"in_app" | "email" | "webhook">;
  };
  filter?: {
    status?: "all" | "pending" | "scheduled" | "completed" | "failed";
    limit?: number;
  };
}

interface TaskSchedulerOutput {
  success: boolean;
  task?: UntypedJson;
  tasks?: UntypedJson[];
  total?: number;
  message?: string;
  error?: string;
}

// ============================================================================
// SCHEMA (JSON Schema)
// ============================================================================

const recurrenceSchema: JSONSchema7 = objectProp(
  "Recurrence configuration for repeating tasks",
  {
    frequency: enumProp("How often to repeat", [
      "hourly",
      "daily",
      "weekly",
      "monthly",
    ]),
    interval: integerProp("Interval between recurrences. Defaults to 1.", {
      minimum: 1,
    }),
    startAt: stringProp("ISO datetime for first occurrence"),
    timezone: stringProp("IANA timezone string"),
    weekdays: arrayProp(
      "Days of week for weekly recurrence",
      enumProp("Day", ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
    ),
  },
  ["frequency"],
);

const scheduleSchema: JSONSchema7 = objectProp(
  "Scheduling details (future, recurring, conditional)",
  {
    type: enumProp("Schedule type. Defaults to 'future' if not provided.", [
      "future",
      "short_term",
      "long_term",
      "conditional",
      "loop",
    ]),
    runAt: stringProp("ISO datetime string for when to run the task"),
    offsetMs: integerProp("Delay in milliseconds from now", { minimum: 0 }),
    horizons: arrayProp("Time horizons for long-term tasks", {
      type: "string",
    }),
    longTermStart: stringProp("Start date for long-term tasks"),
    recurrence: recurrenceSchema,
    summary: stringProp("Human-readable summary of the schedule"),
  },
);

const taskSchema: JSONSchema7 = objectProp(
  "Task details. Required for create action, optional for update",
  {
    title: stringProp("Title of the task"),
    description: stringProp("Task description"),
    kind: stringProp("Category: 'reminder', 'research', 'trade', 'on_chain'"),
    schedule: scheduleSchema,
    notificationChannels: arrayProp(
      "Notification channels",
      enumProp("Channel", ["in_app", "email", "webhook"]),
    ),
  },
  ["title"],
);

const taskSchedulerSchema = createToolSchema(
  {
    action: enumProp("Action to perform", [
      "create",
      "list",
      "update",
      "cancel",
    ]),
    taskId: stringProp("Required for update and cancel actions"),
    task: taskSchema,
    actionPayload: objectProp(
      "Task action details (news_digest or dex_trade)",
      {
        type: enumProp("Action type", ["news_digest", "dex_trade"]),
        // News Digest Props
        topic: stringProp("Topic for news digest"),
        // DEX Trade Props
        venue: enumProp("DEX Venue", [
          "uniswap",
          "pancakeswap",
          "jupiter",
          "pumpfun",
        ]),
        chain: stringProp("Chain ID or name"),
        tokenIn: stringProp("Token to sell (address or symbol)"),
        tokenOut: stringProp("Token to buy (address or symbol)"),
        amount: stringProp("Amount to trade"),
        side: enumProp("Order side", ["buy", "sell"]),
      },
    ),
  },
  ["action"],
);

// ... (helper remains same)

export const taskSchedulerTool = createTool<
  TaskSchedulerInput & { actionPayload?: UntypedJson },
  TaskSchedulerOutput
>({
  description:
    "Manage the user's task list. Currently supports scheduling 'news_digest' (updates on topics) and 'dex_trade' (recurring/future swaps).",
  schema: taskSchedulerSchema,
  execute: async (
    input: TaskSchedulerInput & { actionPayload?: UntypedJson },
  ): Promise<TaskSchedulerOutput> => {
    const { action, taskId, task, filter, actionPayload } = input;
    const { userId, supabase } = await resolveAuthContext();

    if (!userId) {
      return {
        success: false,
        error: "Authentication required. Please log in to manage tasks.",
      };
    }

    // Lazy load repository functions to avoid module load failures
    let repo: typeof import("@/server/tasks/repository");

    try {
      repo = await import("@/server/tasks/repository");
    } catch (error) {
      logger.error("[TaskScheduler] Failed to load task repository:", error);
      return {
        success: false,
        error: "Task management service is temporarily unavailable.",
      };
    }

    try {
      switch (action) {
        case "create": {
          if (!task) {
            return {
              success: false,
              error: "Task details are required for creation.",
            };
          }

          const schedulePayload = (task.schedule ?? {
            type: "future",
          }) as Parameters<typeof repo.scheduleTaskForUser>[1]["schedule"];

          // Construct Action Payload
          let finalActionPayload: TaskActionInput = {
            type: "news_digest",
            topic: task.description || "General Update",
            limit: 5,
            deliver: ["in_app"],
            includeComments: false,
          };

          if (actionPayload) {
            if (actionPayload.type === "dex_trade") {
              const supportedVenues: DexVenue[] = [
                "0x",
                "uniswap",
                "pancakeswap",
                "jupiter",
                "pumpfun",
                "pumpdotfun",
                "pumpswap",
                "binance",
              ];
              const normalizedVenue: DexVenue = supportedVenues.includes(
                actionPayload.venue as DexVenue,
              )
                ? (actionPayload.venue as DexVenue)
                : "uniswap";
              const normalizedSide: "buy" | "sell" =
                actionPayload.side === "sell" ? "sell" : "buy";
              finalActionPayload = {
                type: "dex_trade",
                venue: normalizedVenue,
                chainId: Number(actionPayload.chain) || 1,
                side: normalizedSide,
                baseToken: actionPayload.tokenIn ?? "ETH",
                quoteToken: actionPayload.tokenOut ?? "USDC",
                amount: actionPayload.amount ?? "0",
                amountMode: normalizedSide === "buy" ? "buy" : "sell",
                slippageBps: 50,
                executionMode: "simulate", // Default to safe mode
                allowPartialFill: false,
              };
            } else if (actionPayload.type === "news_digest") {
              finalActionPayload = {
                type: "news_digest",
                topic: actionPayload.topic ?? task.description ?? "Crypto News",
                limit: 5,
                deliver: ["in_app"],
                includeComments: false,
              };
            }
          }

          const result = await repo.scheduleTaskForUser(
            userId,
            {
              task: {
                title: task.title,
                description: task.description,
                kind: task.kind,
                action: finalActionPayload,
                notificationChannels: ["in_app"],
              },
              schedule: schedulePayload,
            },
            supabase ?? undefined,
          );

          return {
            success: true,
            task: result,
            message: "Task created successfully.",
          };
        }

        case "list": {
          const result = await repo.fetchTasksForUser(
            userId,
            {
              status: filter?.status,
              limit: filter?.limit,
            },
            supabase ?? undefined,
          );

          return {
            success: true,
            tasks: result.tasks,
            total: result.total,
          };
        }

        case "update": {
          if (!taskId) {
            return {
              success: false,
              error: "Task ID is required for updates.",
            };
          }

          const updateSchedule = task?.schedule as Parameters<
            typeof repo.updateTaskDefinitionForUser
          >[2]["schedule"];

          const result = await repo.updateTaskDefinitionForUser(
            userId,
            taskId,
            {
              title: task?.title,
              description: task?.description,
              kind: task?.kind,
              schedule: updateSchedule,
            },
            supabase ?? undefined,
          );

          return {
            success: true,
            task: result,
            message: "Task updated successfully.",
          };
        }

        case "cancel": {
          if (!taskId) {
            return {
              success: false,
              error: "Task ID is required for cancellation.",
            };
          }

          const success = await repo.cancelTaskForUser(
            userId,
            taskId,
            supabase ?? undefined,
          );

          return {
            success,
            message: success ? "Task cancelled." : "Failed to cancel task.",
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      logger.error("[TaskScheduler] Error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      };
    }
  },
});

// Export schema for backward compatibility
export { taskSchedulerSchema };
