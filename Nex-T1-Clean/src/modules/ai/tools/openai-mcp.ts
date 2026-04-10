/**
 * OpenAI MCP Tool
 * 
 * Domain: AI Tools - MCP Integration
 * Responsibility: Invoke OpenAI Responses API with MCP connectors
 * Notes: Modernized to use AI SDK 5.0 native tool pattern with JSON Schema.
 */

import {
  createTool,
  createToolSchema,
  stringProp,
  integerProp,
  numberProp,
  enumProp,
  arrayProp,
  objectProp,
} from "./create-tool";
import type { JSONSchema7 } from "json-schema";
import { invokeOpenAiMcp } from "@/server/services/mcp/openai-mcp";
import { runToolSpan } from "@/lib/observability/sentry";

// ============================================================================
// TYPES
// ============================================================================

export interface OpenaiMcpToolInput {
  prompt: string;
  context?: string;
  messages?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export type OpenaiMcpToolResult = Awaited<ReturnType<typeof invokeOpenAiMcp>>;

interface OpenaiMcpOutput {
  result?: OpenaiMcpToolResult;
  error?: string;
}

// ============================================================================
// SCHEMA
// ============================================================================

const messageSchema: JSONSchema7 = objectProp("Chat message", {
  role: enumProp("Message role", ["user", "assistant", "system"]),
  content: stringProp("Message content", { minLength: 1 }),
}, ["role", "content"]);

const mcpInvocationSchema = createToolSchema(
  {
    prompt: stringProp("Provide a prompt for the MCP invocation", { minLength: 1 }),
    context: stringProp("Additional context for the prompt"),
    messages: arrayProp("Previous conversation messages", messageSchema),
    model: stringProp("OpenAI model to use"),
    maxOutputTokens: integerProp("Maximum output tokens", { minimum: 1 }),
    temperature: numberProp("Sampling temperature", { minimum: 0, maximum: 2 }),
  },
  ["prompt"],
);

// ============================================================================
// HELPERS
// ============================================================================

// ============================================================================
// TOOL
// ============================================================================

export const openaiMcpTool = createTool<OpenaiMcpToolInput, OpenaiMcpOutput>({
  description:
    "Invoke OpenAI Responses API with MCP connectors (toolset) to fulfill the prompt. Toolset is sourced from environment defaults only.",
  schema: mcpInvocationSchema,
  execute: async (input: OpenaiMcpToolInput): Promise<OpenaiMcpOutput> => {
    const {
      prompt,
      context,
      messages = [],
      model,
      maxOutputTokens,
      temperature,
    } = input;

    try {
      const result = await runToolSpan("openai_mcp", async (span) => {
        span.setAttribute("ai.tool.prompt.length", prompt.length);
        span.setAttribute("ai.tool.messages.count", messages.length);
        if (model) span.setAttribute("ai.tool.model", model);
        if (typeof maxOutputTokens === "number") {
          span.setAttribute("ai.tool.max_output_tokens", maxOutputTokens);
        }
        if (typeof temperature === "number") {
          span.setAttribute("ai.tool.temperature", temperature);
        }

        return invokeOpenAiMcp({
          prompt,
          context,
          messages,
          model,
          maxOutputTokens,
          temperature,
        });
      });

      return { result };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error invoking OpenAI MCP",
      };
    }
  },
});

// Export schema for backward compatibility
export { mcpInvocationSchema };
