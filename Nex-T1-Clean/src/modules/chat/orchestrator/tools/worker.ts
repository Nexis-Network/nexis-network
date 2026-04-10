import { tool, generateObject, gateway } from "ai";
import { z } from "zod";
// import { WorkerResultSchema, WorkerTaskSchema } from "./schema";
import { CryptoAnalystWorker } from "./workers/crypto_analyst";
import { OnChainTraderWorker } from "./workers/onchain_trader";
import { BrowserAnalystWorker } from "./workers/browser_analyst";
import { PumpFunWorker } from "./workers/pump_fun_agent";
import { MarketDataWorker } from "./workers/market_data_agent";
import { DexAnalystWorker } from "./workers/dex_analyst_agent";
import { SocialWorker } from "./workers/social_agent";
import { CexAnalystWorker } from "./workers/cex_analyst_agent";
import { DefiProtocolWorker } from "./workers/defi_protocol_agent";
import { LendingBorrowingWorker } from "./workers/lending_borrowing_agent";
import { PerpetualWorker } from "./workers/perpetual_agent";
import { RugCheckWorker } from "./workers/rug_check_agent";
import { PredictionMarketWorker } from "./workers/prediction_market_agent";

import { logger } from '@/lib/logger';
/**
 * Worker Tool - Executes specialized tasks assigned by the orchestrator
 *
 * This tool represents a specialized worker that can handle specific types of tasks
 * based on their expertise area (frontend, backend, database, etc.).
 */
export const workerTool = tool({
  description:
    "Execute specialized tasks assigned by the orchestrator with domain-specific expertise",
  inputSchema: z.object({
    taskId: z.string().describe("Unique identifier for this task"),
    workerType: z
      .enum([
        "frontend",
        "backend",
        "database",
        "api",
        "testing",
        "documentation",
        "research",
        "design",
        "deployment",
        "crypto_analyst",
        "onchain_trader",
        "browser_analyst",
        "pump_fun_analyst",
        "market_data_analyst",
        "dex_analyst",
        "social_media_analyst",
        "cex_analyst",
        "defi_protocol_analyst",
        "lending_borrowing_analyst",
        "perpetual_analyst",
        "rug_check_analyst",
        "prediction_market_analyst",
      ])
      .describe("Type of worker needed for this task"),
    description: z
      .string()
      .describe("Detailed description of the task to be performed"),
    requirements: z
      .array(z.string())
      .describe("Specific requirements and constraints for this task"),
    context: z
      .string()
      .describe("Additional context about the project and dependencies"),
    expectedOutput: z
      .string()
      .describe("What the worker should produce as output"),
    priority: z
      .enum(["low", "medium", "high", "urgent"])
      .default("medium")
      .describe("Task priority"),
  }),
  async *execute({
    taskId,
    workerType,
    description,
    requirements,
    context,
    expectedOutput,
    priority,
  }) {
    yield { state: "loading" as const };

    try {
      // Dispatch to specialized workers if available
      if (workerType === "crypto_analyst") {
        const result = await CryptoAnalystWorker.execute({ taskId, description, context, requirements, priority });
        yield { state: "ready" as const, result };
        return;
      }
      if (workerType === "onchain_trader") {
        const result = await OnChainTraderWorker.execute({ taskId, description, context, requirements, priority });
        yield { state: "ready" as const, result };
        return;
      }
      if (workerType === "browser_analyst") {
        const result = await BrowserAnalystWorker.execute({ taskId, description, context, requirements, priority });
        yield { state: "ready" as const, result };
        return;
      }
      if (workerType === "pump_fun_analyst") {
        const result = await PumpFunWorker.execute({ taskId, description, context, requirements, priority });
        yield { state: "ready" as const, result };
        return;
      }
      if (workerType === "market_data_analyst") {
        const result = await MarketDataWorker.execute({ taskId, description, context, requirements, priority });
        yield { state: "ready" as const, result };
        return;
      }
      if (workerType === "dex_analyst") {
        const result = await DexAnalystWorker.execute({ taskId, description, context, requirements, priority });
        yield { state: "ready" as const, result };
        return;
      }
      if (workerType === "social_media_analyst") {
        const result = await SocialWorker.execute({ taskId, description, context, requirements, priority });
        yield { state: "ready" as const, result };
        return;
      }
      if (workerType === "cex_analyst") {
        const result = await CexAnalystWorker.execute({ taskId, description, context, requirements, priority });
        yield { state: "ready" as const, result };
        return;
      }
      if (workerType === "defi_protocol_analyst") {
        const result = await DefiProtocolWorker.execute({ taskId, description, context, requirements, priority });
        yield { state: "ready" as const, result };
        return;
      }
      if (workerType === "lending_borrowing_analyst") {
        const result = await LendingBorrowingWorker.execute({ taskId, description, context, requirements, priority });
        yield { state: "ready" as const, result };
        return;
      }
      if (workerType === "perpetual_analyst") {
        const result = await PerpetualWorker.execute({ taskId, description, context, requirements, priority });
        yield { state: "ready" as const, result };
        return;
      }
      if (workerType === "rug_check_analyst") {
        const result = await RugCheckWorker.execute({ taskId, description, context, requirements, priority });
        yield { state: "ready" as const, result };
        return;
      }
      if (workerType === "prediction_market_analyst") {
        const result = await PredictionMarketWorker.execute({ taskId, description, context, requirements, priority });
        yield { state: "ready" as const, result };
        return;
      }

      // Use AI to perform the specialized work dynamically
      const { object: result } = await generateObject({
        model: gateway("openai/gpt-4.1-mini"),
        schema: z.object({
          output: z.string(),
          explanation: z.string(),
          deliverables: z.array(z.object({
            name: z.string(),
            type: z.enum(["code", "documentation", "design", "analysis", "test", "configuration"]),
            content: z.string(),
            status: z.enum(["draft", "review", "approved", "completed"]),
          })).optional(),
          issues: z.array(z.string()).optional(),
          suggestions: z.array(z.string()).optional(),
        }),
        system: `You are a specialized expert worker of type: ${workerType}.
        Your goal is to execute the assigned task to the best of your ability.
        
        Task: ${description}
        Requirements: ${requirements?.join(", ") || "None"}
        Context: ${context || "None"}
        Expected Output: ${expectedOutput || "None"}
        Priority: ${priority}`,
        prompt: "Execute the task and generate the deliverables.",
      });

      const workerResult = {
        taskId,
        status: "completed" as const,
        ...result,
      };

      yield { state: "ready" as const, result: workerResult };
    } catch (error) {
           logger.error("Failed to execute worker task:", error);
           yield { state: "output-error", errorText: "Failed to execute work" };
    }
  },
});

export type WorkerUIToolInvocation = {
  state:
    | "loading"
    | "ready"
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input?: {
    taskId: string;
    workerType:
      | "frontend"
      | "backend"
      | "database"
      | "api"
      | "testing"
      | "documentation"
      | "research"
      | "design"
      | "deployment";
    description: string;
    requirements: string[];
    context: string;
    expectedOutput: string;
    priority: "low" | "medium" | "high" | "urgent";
  };
  output?: {
    state: "loading" | "ready";
    result?: {
      taskId: string;
      status: "completed" | "failed" | "needs_review";
      output: string;
      explanation: string;
      deliverables?: Array<{
        name: string;
        type:
          | "code"
          | "documentation"
          | "design"
          | "analysis"
          | "test"
          | "configuration";
        content: string;
        status: "draft" | "review" | "approved" | "completed";
      }>;
      issues?: string[];
      suggestions?: string[];
    };
  };
  errorText?: string;
};
