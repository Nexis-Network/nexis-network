/**
 * Graph Knowledge Tool
 * 
 * Domain: AI Tools - GraphRAG
 * Responsibility: Query the FalkorDB knowledge graph.
 * Notes: Uses the 'redis' client wrapped in src/lib/graph.ts to execute direct Cypher queries.
 */

import {
  createTool,
  createToolSchema,
  stringProp,
  integerProp,
} from "./create-tool";
import { cypherQuery } from "@/lib/graph";


import { logger } from '@/lib/logger';
// ============================================================================
// TYPES
// ============================================================================

interface GraphKnowledgeInput {
  query: string;
  graphName?: string;
  limit?: number;
}

interface GraphKnowledgeOutput {
  results: UntypedJson[];
  error?: string;
  metadata?: {
    query: string;
    graph: string;
  };
}

// ============================================================================
// SCHEMA
// ============================================================================

const graphKnowledgeSchema = createToolSchema(
  {
    query: stringProp(
      "The OpenCypher query to execute against the knowledge graph. " +
      "Example: MATCH (p:Person)-[:OWNS]->(t:Token) WHERE t.symbol = 'NEX' RETURN p.name",
      { minLength: 5 }
    ),
    graphName: stringProp("Name of the graph key in FalkorDB", {
      default: "nex-knowledge",
    }),
    limit: integerProp("Maximum number of records to return", {
      default: 10,
      minimum: 1,
      maximum: 50,
    }),
  },
  ["query"]
);

// ============================================================================
// TOOL
// ============================================================================

export const graphKnowledgeTool = createTool<
  GraphKnowledgeInput,
  GraphKnowledgeOutput
>({
  description:
    "Query the FalkorDB Knowledge Graph to find relationships between entities (People, Projects, Tokens, etc.). " +
    "Use this tool when questions involve 'connections', 'ownership', 'relationships', or complex traversals.",
  schema: graphKnowledgeSchema,
  execute: async (input: GraphKnowledgeInput): Promise<GraphKnowledgeOutput> => {
    const {
      query,
      graphName = "nex-knowledge",
      // limit is handled in cypher query construction usually, but we accept it as context
    } = input;

    try {
      // Execute the query
      // Note: cypherQuery in lib/graph handles the low-level Redis command
      const results = await cypherQuery(graphName, query);

      return {
        results,
        metadata: {
          query,
          graph: graphName,
        },
      };
    } catch (error) {
      logger.error("[GraphKnowledgeTool] Execution failed:", error);
      return {
        results: [],
        error: error instanceof Error ? error.message : "Review logs for details.",
      };
    }
  },
});
