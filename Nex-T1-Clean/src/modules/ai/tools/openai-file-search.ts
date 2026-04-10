/**
 * OpenAI File Search Tool
 * 
 * Domain: AI Tools - Document Search
 * Responsibility: Query vector stores via OpenAI's file_search
 * Notes: Modernized to use AI SDK 5.0 native tool pattern with JSON Schema.
 */

import {
  createTool,
  createToolSchema,
  stringProp,
  integerProp,
  booleanProp,
  arrayProp,
  objectProp,
} from "./create-tool";
import type { JSONSchema7 } from "json-schema";
import {
  callOpenAiResponses,
  extractTextFromOutput,
  extractToolCalls,
  type ToolCallRecord,
} from "@/server/services/ai-sdk/openai-responses";
import { runToolSpan } from "@/lib/observability/sentry";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_FILE_SEARCH_MODEL =
  process.env.OPENAI_FILE_SEARCH_MODEL ?? process.env.OPENAI_MCP_MODEL ?? "gpt-5-mini";

const defaultVectorStoreIds = process.env.OPENAI_FILE_SEARCH_VECTOR_STORE_IDS
  ? process.env.OPENAI_FILE_SEARCH_VECTOR_STORE_IDS.split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
  : [];

// ============================================================================
// TYPES
// ============================================================================

interface FileSearchInput {
  query: string;
  model?: string;
  vectorStoreIds?: string[];
  limit?: number;
  rerank?: boolean;
  metadataFilter?: Array<{ key: string; value: string | number | boolean }>;
}

export type FileSearchResult = {
  text: string;
  toolCalls: ToolCallRecord[];
  raw: UntypedJson;
  error?: string;
};

// ============================================================================
// SCHEMA
// ============================================================================

const metadataFilterSchema: JSONSchema7 = objectProp("Metadata filter entry", {
  key: stringProp("Metadata field name"),
  value: {
    oneOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
    description: "Filter value",
  } as JSONSchema7,
}, ["key", "value"]);

const fileSearchSchema = createToolSchema(
  {
    query: stringProp("Provide a query for file search", { minLength: 1 }),
    model: stringProp("OpenAI model to use", { default: DEFAULT_FILE_SEARCH_MODEL }),
    vectorStoreIds: arrayProp("Vector store IDs to search", { type: "string", minLength: 1 }),
    limit: integerProp("Maximum number of results", { minimum: 1, maximum: 50 }),
    rerank: booleanProp("Enable result reranking"),
    metadataFilter: arrayProp("Metadata filters as key-value pairs", metadataFilterSchema),
  },
  ["query"],
);

// ============================================================================
// TOOL
// ============================================================================

export const openaiFileSearchTool = createTool<FileSearchInput, FileSearchResult>({
  description:
    "Query OpenAI's file_search tool to ground responses on documents stored in configured vector stores.",
  schema: fileSearchSchema,
  execute: async (input: FileSearchInput): Promise<FileSearchResult> => {
    const {
      query,
      model = DEFAULT_FILE_SEARCH_MODEL,
      vectorStoreIds,
      limit,
      rerank,
      metadataFilter: _metadataFilter, // Currently unused - OpenAI API format doesn't support top-level metadata filter
    } = input;

    try {
      const result = await runToolSpan("openai_file_search", async (span) => {
        const stores = (vectorStoreIds && vectorStoreIds.length > 0
          ? vectorStoreIds
          : defaultVectorStoreIds
        ).filter((id: string) => id.length > 0);

        if (stores.length === 0) {
          throw new Error(
            "No vector store IDs provided. Set OPENAI_FILE_SEARCH_VECTOR_STORE_IDS or pass vectorStoreIds.",
          );
        }

        span.setAttribute("ai.tool.model", model);
        span.setAttribute("ai.tool.query.length", query.length);
        span.setAttribute("ai.tool.vector_stores.count", stores.length);
        if (typeof limit === "number") {
          span.setAttribute("ai.tool.limit", limit);
        }
        if (typeof rerank === "boolean") {
          span.setAttribute("ai.tool.rerank", rerank);
        }

        // Build file_search tool with configuration inline
        const fileSearchTool: Record<string, UntypedJson> = {
          type: "file_search",
          file_search: {
            vector_store_ids: stores,
            ...(typeof limit === "number" ? { max_num_results: limit } : {}),
            ...(typeof rerank === "boolean"
              ? { ranking_options: { ranker: rerank ? "auto" : "default_2024_08_21" } }
              : {}),
          },
        };

        const payload: Record<string, UntypedJson> = {
          model,
          tools: [fileSearchTool],
          input: [{ role: "user", content: query }],
          stream: true,
        };

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
    } catch (error) {
      return {
        text: "",
        toolCalls: [],
        raw: null,
        error: error instanceof Error ? error.message : "Failed to execute OpenAI file search.",
      };
    }
  },
});

// Export schema for backward compatibility
export { fileSearchSchema };
