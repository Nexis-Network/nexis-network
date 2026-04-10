import { z } from "zod";

/**
 * Schema for implementation plan items
 */
export const ImplementationItemSchema = z.object({
  purpose: z.string().describe("What this item accomplishes"),
  category: z
    .enum([
      "research",
      "design",
      "development",
      "testing",
      "deployment",
      "documentation",
    ])
    .describe("Category of work needed"),
  deliverable: z.string().describe("What will be produced or delivered"),
  priority: z.enum(["low", "medium", "high"]).describe("Priority level"),
  estimatedComplexity: z
    .enum(["low", "medium", "high"])
    .describe("Estimated complexity"),
  dependencies: z
    .array(z.string())
    .optional()
    .describe("Other items this depends on"),
  estimatedDuration: z
    .string()
    .describe("Estimated time to complete (e.g., '2 hours', '1 day')"),
});

/**
 * Schema for worker task assignments
 */
export const WorkerTaskSchema = z.object({
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
    .describe("Type of worker needed"),
  description: z.string().describe("Detailed description of the task"),
  requirements: z
    .array(z.string())
    .describe("Specific requirements for this task"),
  context: z.string().describe("Additional context for the worker"),
  expectedOutput: z.string().describe("What the worker should produce"),
});

/**
 * Schema for worker results
 */
export const WorkerResultSchema = z.object({
  taskId: z.string(),
  status: z.enum(["completed", "failed", "needs_review"]),
  output: z.string().describe("The work produced by the worker"),
  explanation: z.string().describe("Explanation of what was done"),
  deliverables: z
    .array(
      z.object({
        name: z.string().describe("Name of the deliverable"),
        type: z.enum([
          "code",
          "documentation",
          "design",
          "analysis",
          "test",
          "configuration",
        ]),
        content: z.string().describe("The actual content or description"),
        status: z.enum(["draft", "review", "approved", "completed"]),
      })
    )
    .optional(),
  issues: z.array(z.string()).optional().describe("Any issues encountered"),
  suggestions: z
    .array(z.string())
    .optional()
    .describe("Suggestions for improvement"),
});

/**
 * Schema for orchestration summary
 */
export const OrchestrationSummarySchema = z.object({
  totalTasks: z.number(),
  completedTasks: z.number(),
  failedTasks: z.number(),
  overallStatus: z.enum(["in_progress", "completed", "failed", "needs_review"]),
  nextSteps: z.array(z.string()).describe("Recommended next steps"),
  blockers: z.array(z.string()).optional().describe("Current blockers"),
  qualityScore: z.number().min(0).max(100).describe("Overall quality score"),
});
