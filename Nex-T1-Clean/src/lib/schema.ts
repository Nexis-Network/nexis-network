import { z } from "zod";

// --- Task generation schema (used by /api/agent route) ---
export const tasksSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string().min(1),
        items: z.array(
          z.object({
            type: z.enum(["text", "file"]).default("text"),
            content: z.string().min(1),
            status: z
              .enum(["pending", "in_progress", "completed"]) 
              .default("pending"),
            file: z
              .object({
                name: z.string(),
                icon: z.enum([
                  "react",
                  "typescript",
                  "javascript",
                  "css",
                  "html",
                  "json",
                  "markdown",
                ]),
              })
              .optional(),
          })
        ),
      })
    )
    .min(1),
});

export const parallelResultSchema = z.object({
  task: z.string(),
  result: z.string(),
  icon: z.string(),
  color: z.string(),
});

export const parallelProcessingSchema = z.object({
  results: z.array(parallelResultSchema),
  metadata: z.object({
    inputLength: z.number(),
    processedAt: z.string(),
    workers: z.number(),
    perspectives: z.array(z.string()),
  }),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    totalTokens: z.number(),
  }),
});


export const AIAgentSchema = z.object({
  name: z.string().describe("A catchy, memorable name for the AI agent"),
  tagline: z
    .string()
    .describe("A short, compelling tagline that describes the agent's purpose"),
  description: z
    .string()
    .describe("Detailed description of what the agent does"),
  useCase: z.string().describe("Primary use case and target audience"),
  features: z.array(z.string()).describe("Key features and capabilities"),
  uniqueValue: z.string().describe("What makes this agent unique and valuable"),
});
export type AIAgent = z.infer<typeof AIAgentSchema>;
export const AIAgentStreamSchema = z.object({
  thought: z
    .string()
    .describe("The AI's thought process while generating ideas"),
  ideaFragment: z
    .string()
    .describe("A fragment of the AI agent idea being generated"),
});
export type AIAgentStream = z.infer<typeof AIAgentStreamSchema>;

export const SourceSchema = z.object({
  id: z
    .string()
    .optional()
    .describe("Stable identifier that can be referenced inline"),
  title: z.string().describe("Descriptive title for the external source"),
  url: z.string().url().describe("Publicly accessible URL for the source"),
  snippet: z
    .string()
    .optional()
    .describe("Short snippet that summarizes the relevant part of the source"),
  filename: z.string().optional().describe("Filename for document sources"),
  mediaType: z.string().optional().describe("MIME type for document sources"),
});
export type Source = z.infer<typeof SourceSchema>;

export enum TaskType {
  CHAIN = "chain",
  NEWS_DIGEST = "news_digest",
  DEX_TRADE = "dex_trade",
}

export enum TaskStatus {
  QUEUED = "queued",
  EXECUTING = "executing",
  COMPLETED = "completed",
  FAILED = "failed",
  DELAYED = "delayed",
  CANCELLED = "cancelled",
  REQUIRES_ACTION = "requires_action",
}

export type TaskResult = {
  id: string;
  status: TaskStatus;
  type: TaskType;
  payload: {
    name?: string;
    data?: Record<string, UntypedJson>;
    [key: string]: UntypedJson;
  };
  createdAt: string;
  completedAt?: string | null;
  error?: { message?: string } | null;
  output?: UntypedJson;
};

// --- AI Elements Runtime Architecture (v6) ---
export type AIEvent =
  | { type: "message_delta"; textChunk: string }
  | { type: "reasoning_update"; reasoningChunk: string; isComplete: boolean }
  | { type: "citation"; url: string; title?: string; snippet?: string }
  | { type: "sources"; sources: Array<{ id: string; url: string; title: string }> }
  | { type: "tool_call"; toolCallId: string; toolName: string; args: Record<string, unknown> }
  | { type: "tool_result"; toolCallId: string; toolName: string; result: unknown; isError?: boolean }
  | { type: "artifact_update"; artifactId: string; artifactType?: string; status: "pending" | "running" | "completed" | "failed"; progress?: number; error?: string }
  | { type: "agent_handoff"; fromAgent?: string; toAgent: string; reason?: string; metadata?: Record<string, unknown> }
  | { type: "approval_required"; approvalId?: string; preview?: Record<string, unknown>; expiresAt?: string; toolName?: string | null }
  | { type: "approval_update"; approvalId?: string; state?: string }
  | { type: "sandbox_start"; sandboxId: string; template: string }
  | { type: "sandbox_stream"; sandboxId: string; streamType: "stdout" | "stderr"; data: string }
  | { type: "terminal_stream"; command: string; output: string; isComplete: boolean }
  | { type: "workflow_update"; workflowId: string; status: "pending" | "running" | "completed" | "failed"; stepName: string; progress?: number }
  | {
      type: "task_update";
      taskId: string;
      title: string;
      status: "pending" | "in_progress" | "done" | "error";
      description?: string;
    }
  | { type: "test_result"; testId: string; name: string; status: "pass" | "fail" | "warn" | "info"; metadata?: Record<string, unknown> }
  | { type: "confirmation_request"; confirmationId: string; action: string; summary: string; payload: Record<string, unknown>; riskLevel?: "low" | "medium" | "high" }
  | { type: "confirmation_response"; confirmationId: string; status: "approved" | "rejected"; txHash?: string; error?: string }
  | { type: "image_output"; url: string; alt?: string; width?: number; height?: number }
  | { type: "transcription_output"; text: string; isFinal: boolean; sourceId?: string }
  | { type: "jsx_output"; code: string; isComplete: boolean }
  | { type: "web_preview_output"; html: string; url?: string; isComplete: boolean };
