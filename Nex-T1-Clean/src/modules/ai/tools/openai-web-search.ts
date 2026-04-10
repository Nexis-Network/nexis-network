/**
 * OpenAI Web Search Tool
 *
 * Domain: AI Tools - Web Search
 * Responsibility: Runs OpenAI's built-in web_search tool via Responses API
 * Depends on: createTool, openai-responses service
 * Notes: Modernized to use AI SDK 5.0 native tool pattern with JSON Schema.
 */

import {
  callOpenAiResponses,
  extractTextFromOutput,
  extractToolCalls,
  type ToolCallRecord,
} from "@/server/services/ai-sdk/openai-responses";
import { runToolSpan } from "@/lib/observability/sentry";
import {
  createTool,
  createToolSchema,
  stringProp,
  arrayProp,
  objectProp,
} from "./create-tool";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_WEB_SEARCH_MODEL =
  process.env.OPENAI_WEB_SEARCH_MODEL ?? process.env.OPENAI_MCP_MODEL ?? "gpt-5-mini";

// ============================================================================
// SCHEMA (JSON Schema)
// ============================================================================

const webSearchSchema = createToolSchema(
  {
    query: stringProp("The search query to execute"),
    model: {
      type: "string",
      description: "OpenAI model to use for web search",
      default: DEFAULT_WEB_SEARCH_MODEL,
    },
    options: arrayProp(
      "Additional web search options as key-value pairs",
      objectProp("Option entry", {
        key: stringProp("Option name"),
        value: {
          oneOf: [
            { type: "string" },
            { type: "number" },
            { type: "boolean" },
          ],
          description: "Option value",
        },
      })
    ),
  },
  ["query"]
);

// ============================================================================
// TYPES
// ============================================================================

interface WebSearchInput {
  query: string;
  model?: string;
  options?: Array<{ key: string; value: string | number | boolean }>;
}

export interface WebSearchResult {
  text: string;
  toolCalls: ToolCallRecord[];
  raw: UntypedJson;
}

// ============================================================================
// TOOL
// ============================================================================

export const openaiWebSearchTool = createTool<WebSearchInput, WebSearchResult>({
  description:
    "Run OpenAI's built-in web_search tool (Responses API) to gather current information from the public web.",
  schema: webSearchSchema,
  execute: async ({
    query,
    model = DEFAULT_WEB_SEARCH_MODEL,
    options,
  }): Promise<WebSearchResult> => {
    const result = await runToolSpan("openai_web_search", async (span) => {
      span.setAttribute("ai.tool.model", model);
      span.setAttribute("ai.tool.query.length", query.length);
      span.setAttribute("ai.tool.options.count", options?.length ?? 0);

      const payload: Record<string, UntypedJson> = {
        model,
        tools: [{ type: "web_search" }],
        input: [{ role: "user", content: query }],
        stream: true,
      };

      // Convert options array to record for the API
      if (options && options.length > 0) {
        const optionsRecord: Record<string, UntypedJson> = {};
        for (const opt of options) {
          optionsRecord[opt.key] = opt.value;
        }
        payload.web_search_options = optionsRecord;
      }

      const data = await callOpenAiResponses(payload);
      const text = extractTextFromOutput(data);
      const toolCalls = extractToolCalls(data);

      return {
        text,
        toolCalls,
        raw: data,
      };
    });

    return result;
  },
});
