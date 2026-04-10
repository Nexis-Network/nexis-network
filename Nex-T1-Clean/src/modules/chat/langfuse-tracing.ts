/**
 * LangFuse Tracing Module
 *
 * Domain: Chat Pipeline
 * Responsibility: Provides observability and tracing for the chat pipeline,
 *                 tool executions, and model interactions.
 * Depends on: langfuse
 * Notes: Integrates with LangFuse for production monitoring, debugging,
 *        and cost tracking.
 *
 * Features:
 * - Pipeline-level traces
 * - Tool execution spans
 * - Model generation tracking
 * - Error capture
 * - Cost attribution
 */

import { Langfuse } from "langfuse";
import type { IntentClassification } from "./intent-classifier";


import { logger } from '@/lib/logger';
// ============================================================================
// CLIENT
// ============================================================================

let langfuseInstance: Langfuse | null = null;

export function getLangfuseClient(): Langfuse | null {
  if (langfuseInstance) return langfuseInstance;

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;

  if (!publicKey || !secretKey) {
    return null;
  }

  langfuseInstance = new Langfuse({
    publicKey,
    secretKey,
    baseUrl: process.env.LANGFUSE_BASEURL ?? process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
    // Flush on every event in development for immediate visibility
    flushAt: process.env.NODE_ENV === "development" ? 1 : 10,
    flushInterval: process.env.NODE_ENV === "development" ? 500 : 5000,
  });

  return langfuseInstance;
}

export function isLangfuseConfigured(): boolean {
  return Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}

// ============================================================================
// TYPES
// ============================================================================

export type TraceContext = {
  traceId: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, UntypedJson>;
};

export type SpanContext = {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  startTime: Date;
};

export type GenerationInput = {
  model: string;
  prompt: string;
  messages?: Array<{ role: string; content: string }>;
  tools?: string[];
  maxTokens?: number;
  temperature?: number;
};

export type GenerationOutput = {
  completion?: string;
  toolCalls?: Array<{ name: string; args: UntypedJson }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
};

// ============================================================================
// TRACE MANAGEMENT
// ============================================================================

/**
 * Creates a new trace for a chat pipeline execution.
 */
export function createPipelineTrace(params: {
  sessionId?: string;
  userId?: string;
  model: string;
  query: string;
  classification?: IntentClassification;
  metadata?: Record<string, UntypedJson>;
}): TraceContext | null {
  const langfuse = getLangfuseClient();
  if (!langfuse) return null;

  const trace = langfuse.trace({
    name: "chat-pipeline",
    sessionId: params.sessionId,
    userId: params.userId,
    input: { query: params.query },
    metadata: {
      model: params.model,
      intentCategory: params.classification?.category,
      intentConfidence: params.classification?.confidence,
      ...params.metadata,
    },
    tags: [
      `model:${params.model}`,
      params.classification?.category ? `intent:${params.classification.category}` : "intent:unknown",
    ].filter(Boolean),
  });

  return {
    traceId: trace.id,
    sessionId: params.sessionId,
    userId: params.userId,
    metadata: params.metadata,
  };
}

/**
 * Updates a trace with output and completion status.
 */
export function updatePipelineTrace(
  traceContext: TraceContext | null,
  output: {
    response?: string;
    toolsUsed?: string[];
    cached?: boolean;
    error?: string;
    latencyMs?: number;
  }
): void {
  if (!traceContext) return;

  const langfuse = getLangfuseClient();
  if (!langfuse) return;

  langfuse.trace({
    id: traceContext.traceId,
    output: output.response ? { response: output.response.slice(0, 1000) } : undefined,
    metadata: {
      toolsUsed: output.toolsUsed,
      cached: output.cached,
      latencyMs: output.latencyMs,
      hasError: Boolean(output.error),
    },
  });

  if (output.error) {
    // Create an error event
    langfuse.event({
      traceId: traceContext.traceId,
      name: "pipeline-error",
      level: "ERROR",
      statusMessage: output.error,
    });
  }
}

// ============================================================================
// SPAN MANAGEMENT
// ============================================================================

export function createTraceSpan(
  traceContext: TraceContext | null,
  params: {
    name: string;
    input?: UntypedJson;
    metadata?: Record<string, UntypedJson>;
    parentSpanId?: string;
  },
): SpanContext | null {
  if (!traceContext) return null;

  const langfuse = getLangfuseClient();
  if (!langfuse) return null;

  const span = langfuse.span({
    traceId: traceContext.traceId,
    parentObservationId: params.parentSpanId,
    name: params.name,
    input: params.input ? sanitizeInput(params.input) : undefined,
    metadata: params.metadata,
  });

  return {
    spanId: span.id,
    traceId: traceContext.traceId,
    parentSpanId: params.parentSpanId,
    name: params.name,
    startTime: new Date(),
  };
}

export function endTraceSpan(
  spanContext: SpanContext | null,
  output?: {
    result?: UntypedJson;
    error?: string;
    status?: "success" | "error" | "cancelled";
    metadata?: Record<string, UntypedJson>;
  },
): void {
  if (!spanContext) return;

  const langfuse = getLangfuseClient();
  if (!langfuse) return;

  const status = output?.status ?? "success";
  const latencyMs = Date.now() - spanContext.startTime.getTime();

  langfuse.span({
    id: spanContext.spanId,
    traceId: spanContext.traceId,
    output: output?.result ? sanitizeOutput(output.result) : undefined,
    statusMessage: output?.error,
    level: status === "error" ? "ERROR" : status === "cancelled" ? "WARNING" : "DEFAULT",
    metadata: {
      status,
      latencyMs,
      ...output?.metadata,
    },
  });
}

/**
 * Creates a span for a tool execution.
 */
export function createToolSpan(
  traceContext: TraceContext | null,
  params: {
    toolName: string;
    input: UntypedJson;
    category?: string;
    requiresApproval?: boolean;
  }
): SpanContext | null {
  return createTraceSpan(traceContext, {
    name: `tool:${params.toolName}`,
    input: params.input,
    metadata: {
      category: params.category,
      requiresApproval: params.requiresApproval,
    },
  });
}

/**
 * Ends a tool span with output.
 */
export function endToolSpan(
  spanContext: SpanContext | null,
  output: {
    result?: UntypedJson;
    error?: string;
    status: "success" | "error" | "cancelled";
  }
): void {
  endTraceSpan(spanContext, {
    result: output.result,
    error: output.error,
    status: output.status,
  });
}

// ============================================================================
// GENERATION TRACKING
// ============================================================================

/**
 * Records a model generation (LLM call).
 */
export function recordGeneration(
  traceContext: TraceContext | null,
  params: {
    name: string;
    input: GenerationInput;
    output: GenerationOutput;
    startTime: Date;
    endTime: Date;
    metadata?: Record<string, UntypedJson>;
  }
): void {
  if (!traceContext) return;

  const langfuse = getLangfuseClient();
  if (!langfuse) return;

  langfuse.generation({
    traceId: traceContext.traceId,
    name: params.name,
    model: params.input.model,
    input: {
      messages: params.input.messages,
      tools: params.input.tools,
    },
    output: params.output.completion || params.output.toolCalls,
    usage: params.output.usage,
    startTime: params.startTime,
    endTime: params.endTime,
    metadata: {
      finishReason: params.output.finishReason,
      maxTokens: params.input.maxTokens,
      temperature: params.input.temperature,
      ...params.metadata,
    },
  });
}

// ============================================================================
// EVENT TRACKING
// ============================================================================

/**
 * Records a custom event in the trace.
 */
export function recordEvent(
  traceContext: TraceContext | null,
  params: {
    name: string;
    level?: "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";
    statusMessage?: string;
    metadata?: Record<string, UntypedJson>;
  }
): void {
  if (!traceContext) return;

  const langfuse = getLangfuseClient();
  if (!langfuse) return;

  langfuse.event({
    traceId: traceContext.traceId,
    name: params.name,
    level: params.level ?? "DEFAULT",
    statusMessage: params.statusMessage,
    metadata: params.metadata,
  });
}

/**
 * Records a security event.
 */
export function recordSecurityTrace(
  traceContext: TraceContext | null,
  params: {
    type: "prompt_guard" | "tool_guard" | "output_verify" | "redaction";
    triggered: boolean;
    violations?: Array<{ type: string; severity: string }>;
    metadata?: Record<string, UntypedJson>;
  }
): void {
  if (!traceContext) return;

  recordEvent(traceContext, {
    name: `security:${params.type}`,
    level: params.triggered ? "WARNING" : "DEFAULT",
    statusMessage: params.triggered ? `Security ${params.type} triggered` : undefined,
    metadata: {
      triggered: params.triggered,
      violations: params.violations,
      ...params.metadata,
    },
  });
}

// ============================================================================
// FLUSH & CLEANUP
// ============================================================================

/**
 * Flushes all pending events to LangFuse.
 * Call this before the process exits or at the end of a request.
 */
export async function flushLangfuse(): Promise<void> {
  const langfuse = getLangfuseClient();
  if (!langfuse) return;

  try {
    await langfuse.flushAsync();
  } catch (error) {
    logger.error("[langfuse-tracing] Flush failed:", error);
  }
}

/**
 * Shuts down the LangFuse client gracefully.
 */
export async function shutdownLangfuse(): Promise<void> {
  const langfuse = getLangfuseClient();
  if (!langfuse) return;

  try {
    await langfuse.shutdownAsync();
    langfuseInstance = null;
  } catch (error) {
    logger.error("[langfuse-tracing] Shutdown failed:", error);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function sanitizeInput(input: UntypedJson): UntypedJson {
  if (!input) return input;

  try {
    const str = JSON.stringify(input);
    // Truncate very large inputs
    if (str.length > 10000) {
      return { truncated: true, preview: str.slice(0, 1000) };
    }
    return input;
  } catch {
    return { error: "Input not serializable" };
  }
}

function sanitizeOutput(output: UntypedJson): UntypedJson {
  if (!output) return output;

  try {
    const str = JSON.stringify(output);
    // Truncate very large outputs
    if (str.length > 50000) {
      return { truncated: true, preview: str.slice(0, 5000) };
    }
    return output;
  } catch {
    return { error: "Output not serializable" };
  }
}

// ============================================================================
// CONVENIENCE WRAPPER
// ============================================================================

/**
 * Wraps an async function with tracing.
 */
export function withTracing<T>(
  traceContext: TraceContext | null,
  spanName: string,
  fn: () => Promise<T>,
  metadata?: Record<string, UntypedJson>
): Promise<T> {
  if (!traceContext) {
    return fn();
  }

  const spanContext = createTraceSpan(traceContext, {
    name: spanName,
    metadata,
  });

  return fn()
    .then((result) => {
      endTraceSpan(spanContext, { result: result as UntypedJson, status: "success" });
      return result;
    })
    .catch((error) => {
      endTraceSpan(spanContext, {
        error: error instanceof Error ? error.message : String(error),
        status: "error",
      });
      throw error;
    });
}
