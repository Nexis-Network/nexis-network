/**
 * AWS Documentation Tool (via Exa)
 *
 * Domain: AI Tools - Documentation
 * Responsibility: Search official AWS documentation for debugging and infrastructure guidance.
 * Note: Uses Exa neural search scoped to docs.aws.amazon.com for high-quality results
 *       without requiring a local MCP server connection.
 */

import { createTool, createToolSchema, stringProp, integerProp } from "./create-tool";
import { searchWithExa } from "./exa-web-search";

const AWS_DOCS_DOMAIN = "docs.aws.amazon.com";

// ============================================================================
// TOOLS
// ============================================================================

export const awsDocsSearchTool = createTool<
  { query: string; limit?: number },
  UntypedJson
>({
  description: "Search official AWS documentation for guides, API references, and infrastructure solutions.",
  schema: createToolSchema({
    query: stringProp("Search query (e.g. 'SQS visibility timeout', 'Bedrock agent quotas')"),
    limit: integerProp("Number of results", { default: 5, minimum: 1, maximum: 10 }),
  }),
  execute: async ({ query, limit = 5 }) => {
    // We scope the search strictly to AWS docs
    const result = await searchWithExa(query, {
      numResults: limit,
      includeDomains: [AWS_DOCS_DOMAIN],
      type: "neural", // Neural search understands technical concepts better
      useAutoprompt: true,
      includeHighlights: true,
      includeSummary: true, 
    });

    if (!result) {
      throw new Error("Failed to search AWS documentation (Exa provider unavailable).");
    }

    // Transform for standard tool output
    return {
      query: result.query,
      results: result.results.map(r => ({
        title: r.title,
        url: r.url,
        summary: r.excerpt, // Exa 'excerpt' attempts to use highlights -> summary -> text
        publishedDate: r.publishedDate
      }))
    };
  },
});
