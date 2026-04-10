/**
 * User Knowledge Search Tool
 * 
 * Domain: AI Tools - RAG Search
 * Responsibility: Search user's documents and conversation history
 * Notes: Modernized to use AI SDK 5.0 native tool pattern with JSON Schema.
 */

import {
  createTool,
  createToolSchema,
  stringProp,
  integerProp,
  numberProp,
  booleanProp,
  enumProp,
} from "./create-tool";
import { createClient } from "@/server/services/supabase/server";
import { openai } from "@/server/services/ai-sdk/openai";

// ============================================================================
// TYPES
// ============================================================================

interface UserKnowledgeSearchInput {
  query: string;
  limit?: number;
  threshold?: number;
  includeConversations?: boolean;
  sourceFilter?: "documents" | "conversations" | "all";
}

interface SearchResult {
  id: string;
  source: string;
  content: string;
  similarity: number;
  metadata: UntypedJson;
}

interface UserKnowledgeSearchOutput {
  results?: SearchResult[];
  query?: string;
  totalResults?: number;
  error?: string;
}

// ============================================================================
// SCHEMA
// ============================================================================

const userKnowledgeSearchSchema = createToolSchema(
  {
    query: stringProp("Search query", { minLength: 1 }),
    limit: integerProp("Maximum number of results (1-10)", {
      minimum: 1,
      maximum: 10,
      default: 5,
    }),
    threshold: numberProp("Similarity threshold (0-1)", {
      minimum: 0,
      maximum: 1,
      default: 0.75,
    }),
    includeConversations: booleanProp("Include conversation history in search", true),
    sourceFilter: enumProp(
      "Filter results by source type",
      ["documents", "conversations", "all"],
      "all",
    ),
  },
  ["query"],
);

// ============================================================================
// TOOL
// ============================================================================

export const userKnowledgeSearchTool = createTool<
  UserKnowledgeSearchInput,
  UserKnowledgeSearchOutput
>({
  description:
    "Search user's uploaded documents and conversation history for relevant information using semantic similarity",
  schema: userKnowledgeSearchSchema,
  execute: async (input: UserKnowledgeSearchInput): Promise<UserKnowledgeSearchOutput> => {
    const {
      query,
      limit = 5,
      threshold = 0.75,
      includeConversations = true,
      sourceFilter = "all",
    } = input;

    try {
      const supabase = await createClient();
      if (!supabase) {
        return { error: "Supabase client is not configured" };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { error: "Authentication required" };
      }

      // Generate query embedding
      const embeddingModel = openai.embedding("text-embedding-ada-002");
      const { embeddings: embeddingData } = await embeddingModel.doEmbed({
        values: [query],
      });

      const queryEmbedding = embeddingData[0];

      // Call hybrid search function
      const { data, error } = await supabase.rpc("match_user_knowledge", {
        query_embedding: queryEmbedding as UntypedJson as string,
        match_threshold: threshold,
        match_count: limit,
        filter_user_id: user.id,
        include_conversations: includeConversations && sourceFilter !== "documents",
      });

      if (error) {
        return { error: error.message };
      }

      // Filter by source if specified
      let results = data || [];
      if (sourceFilter === "documents") {
        results = results.filter(
          (r: { source_type: string }) => r.source_type === "document",
        );
      } else if (sourceFilter === "conversations") {
        results = results.filter(
          (r: { source_type: string }) => r.source_type === "conversation",
        );
      }

      return {
        results: results.map(
          (r: {
            id: string;
            source_type: string;
            content: string;
            similarity: number;
            metadata: UntypedJson;
          }) => ({
            id: r.id,
            source: r.source_type,
            content: r.content.slice(0, 500), // Truncate for display
            similarity: r.similarity,
            metadata: r.metadata,
          }),
        ),
        query,
        totalResults: results.length,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to search user knowledge",
      };
    }
  },
});

// Export schema for backward compatibility
export { userKnowledgeSearchSchema };
