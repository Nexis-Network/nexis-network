import { tool } from "ai";
import { z } from "zod";
import { EvaluationResultSchema, OptimizationResultSchema } from "./schema";

/**
 * Send Evaluation Tool - Allows Evaluator Agent to send evaluation results to Optimizer Agent
 */
export const sendEvaluationTool = tool({
  description:
    "Send evaluation results to the Optimizer Agent for content improvement",
  inputSchema: z.object({
    contentId: z
      .string()
      .describe("Unique identifier for the content being evaluated"),
    evaluationResult: EvaluationResultSchema.describe(
      "The evaluation results to send"
    ),
    originalRequest: z.string().describe("The original request or prompt"),
    context: z
      .string()
      .optional()
      .describe("Additional context for the optimization"),
  }),
  async *execute({ contentId, evaluationResult, originalRequest, context }) {
    yield { state: "sending" as const };

    // Simulate sending evaluation to Optimizer Agent
    await new Promise((resolve) => setTimeout(resolve, 800));

    const message = {
      type: "evaluation_result",
      contentId,
      evaluationResult,
      originalRequest,
      context,
      timestamp: new Date().toISOString(),
    };

    yield {
      state: "sent" as const,
      message: "Evaluation results sent to Optimizer Agent",
      evaluationData: message,
    };
  },
});

/**
 * Request Evaluation Tool - Allows Optimizer Agent to request evaluation from Evaluator Agent
 */
export const requestEvaluationTool = tool({
  description:
    "Request evaluation of optimized content from the Evaluator Agent",
  inputSchema: z.object({
    contentId: z.string().describe("Unique identifier for the content"),
    content: z.string().describe("The content to be evaluated"),
    originalRequest: z.string().describe("The original request or prompt"),
    optimizationHistory: z
      .array(z.string())
      .optional()
      .describe("History of optimizations made"),
    context: z
      .string()
      .optional()
      .describe("Additional context for evaluation"),
  }),
  async *execute({
    contentId,
    content,
    originalRequest,
    optimizationHistory,
    context,
  }) {
    yield { state: "requesting" as const };

    // Simulate requesting evaluation from Evaluator Agent
    await new Promise((resolve) => setTimeout(resolve, 600));

    const request = {
      type: "evaluation_request",
      contentId,
      content,
      originalRequest,
      optimizationHistory,
      context,
      timestamp: new Date().toISOString(),
    };

    yield {
      state: "requested" as const,
      message: "Evaluation requested from Evaluator Agent",
      requestData: request,
    };
  },
});

/**
 * Send Optimization Tool - Allows Optimizer Agent to send optimized content to Evaluator Agent
 */
export const sendOptimizationTool = tool({
  description:
    "Send optimized content to the Evaluator Agent for re-evaluation",
  inputSchema: z.object({
    contentId: z.string().describe("Unique identifier for the content"),
    optimizedContent: z.string().describe("The optimized content"),
    optimizationResult: OptimizationResultSchema.describe(
      "Details of the optimization performed"
    ),
    originalRequest: z.string().describe("The original request or prompt"),
    iteration: z.number().describe("The iteration number of this optimization"),
  }),
  async *execute({
    contentId,
    optimizedContent,
    optimizationResult,
    originalRequest,
    iteration,
  }) {
    yield { state: "sending" as const };

    // Simulate sending optimization to Evaluator Agent
    await new Promise((resolve) => setTimeout(resolve, 700));

    const message = {
      type: "optimization_result",
      contentId,
      optimizedContent,
      optimizationResult,
      originalRequest,
      iteration,
      timestamp: new Date().toISOString(),
    };

    yield {
      state: "sent" as const,
      message: "Optimized content sent to Evaluator Agent",
      optimizationData: message,
    };
  },
});

/**
 * Agent Status Tool - Check the status of the other agent
 */
export const checkAgentStatusTool = tool({
  description: "Check the current status of the other agent",
  inputSchema: z.object({
    agentType: z
      .enum(["evaluator", "optimizer"])
      .describe("Type of agent to check status for"),
  }),
  async *execute({ agentType }) {
    yield { state: "checking" as const };

    // Simulate checking agent status
    await new Promise((resolve) => setTimeout(resolve, 300));

    const status = {
      agentType,
      status: "available",
      lastActivity: new Date().toISOString(),
      currentTask:
        agentType === "evaluator"
          ? "Ready to evaluate content"
          : "Ready to optimize content",
    };

    yield {
      state: "checked" as const,
      status,
    };
  },
});

// UI Types for communication tools
export type SendEvaluationUIToolInvocation = {
  state: "sending" | "sent" | "error";
  message?: string;
  evaluationData?: {
    type: string;
    contentId: string;
    evaluationResult: UntypedJson;
    originalRequest: string;
    context?: string;
    timestamp: string;
  };
  errorText?: string;
};

export type RequestEvaluationUIToolInvocation = {
  state: "requesting" | "requested" | "error";
  message?: string;
  requestData?: {
    type: string;
    contentId: string;
    content: string;
    originalRequest: string;
    optimizationHistory?: string[];
    context?: string;
    timestamp: string;
  };
  errorText?: string;
};

export type SendOptimizationUIToolInvocation = {
  state: "sending" | "sent" | "error";
  message?: string;
  optimizationData?: {
    type: string;
    contentId: string;
    optimizedContent: string;
    optimizationResult: UntypedJson;
    originalRequest: string;
    iteration: number;
    timestamp: string;
  };
  errorText?: string;
};

export type CheckAgentStatusUIToolInvocation = {
  state: "checking" | "checked" | "error";
  status?: {
    agentType: "evaluator" | "optimizer";
    status: string;
    lastActivity: string;
    currentTask: string;
  };
  errorText?: string;
};
