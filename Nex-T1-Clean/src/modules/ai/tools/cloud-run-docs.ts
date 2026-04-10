/**
 * Google Cloud Run Documentation Tool (via Exa)
 *
 * Domain: AI Tools - Documentation
 * Responsibility: Search official Google Cloud Run documentation for deployment and configuration.
 * Note: Uses Exa neural search scoped to cloud.google.com/run for authoritative results.
 */

import { createTool, createToolSchema, stringProp, integerProp } from "./create-tool";
import { searchWithExa } from "./exa-web-search";

const CLOUD_RUN_DOCS_DOMAIN = "cloud.google.com/run";

// ============================================================================
// TOOLS
// ============================================================================

export const cloudRunDocsSearchTool = createTool<
  { query: string; limit?: number },
  UntypedJson
>({
  description: "Search official Google Cloud Run documentation for deployment, networking, and scaling guides.",
  schema: createToolSchema({
    query: stringProp("Search query (e.g. 'deploy from source', 'Cloud Run jobs vs services')"),
    limit: integerProp("Number of results", { default: 5, minimum: 1, maximum: 10 }),
  }),
  execute: async ({ query, limit = 5 }) => {
    // We scope the search strictly to Cloud Run docs
    const result = await searchWithExa(query, {
      numResults: limit,
      includeDomains: [CLOUD_RUN_DOCS_DOMAIN],
      type: "neural",
      useAutoprompt: true,
      includeHighlights: true,
      includeSummary: true, 
    });

    if (!result) {
      throw new Error("Failed to search Cloud Run documentation (Exa provider unavailable).");
    }

    // Transform for standard tool output
    return {
      query: result.query,
      results: result.results.map(r => ({
        title: r.title,
        url: r.url,
        summary: r.excerpt,
        publishedDate: r.publishedDate
      }))
    };
  },
});
