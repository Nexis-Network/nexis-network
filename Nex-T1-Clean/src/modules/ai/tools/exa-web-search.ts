/**
 * Exa Web Search Tool
 *
 * Domain: AI Tools - Web Search
 * Responsibility: Provides neural web search via Exa API for comprehensive research.
 * Depends on: createTool
 * Notes: Modernized to use AI SDK 5.0 native tool pattern with JSON Schema.
 *        Primary web search tool for crypto/DeFi research.
 *
 * Features:
 * - Neural search (semantic understanding)
 * - Keyword search (exact matching)
 * - Auto-prompted queries (Exa optimizes the query)
 * - Category filtering (news, research, companies, tweets)
 * - Domain include/exclude
 * - Date range filtering
 * - Content extraction (text, highlights, summaries)
 */

import {

  createTool,
  createToolSchema,
  stringProp,
  integerProp,
  booleanProp,
  arrayProp,
  enumProp,
  resolveToolExecutionResult,
} from "./create-tool";

import { logger } from '@/lib/logger';
// ============================================================================
// CONSTANTS
// ============================================================================

const EXA_API_BASE = "https://api.exa.ai";

const SEARCH_TYPES = ["neural", "keyword", "auto"] as const;
const CATEGORIES = [
  "company",
  "research_paper",
  "news",
  "tweet",
  "github",
  "linkedin",
  "personal_site",
] as const;

// ============================================================================
// SCHEMA (JSON Schema)
// ============================================================================

const exaSearchSchema = createToolSchema(
  {
    query: stringProp("The search query to execute"),
    numResults: integerProp("Number of results to return (1-50)", {
      minimum: 1,
      maximum: 50,
      default: 10,
    }),
    type: enumProp(
      "Search type: neural (semantic), keyword (exact), or auto (Exa decides)",
      SEARCH_TYPES,
      "auto"
    ),
    useAutoprompt: booleanProp(
      "Let Exa optimize the query for better results",
      true
    ),
    category: enumProp(
      "Filter results to a specific content category",
      CATEGORIES
    ),
    includeDomains: arrayProp(
      "Only include results from these domains (e.g., ['coingecko.com', 'defillama.com'])",
      { type: "string" }
    ),
    excludeDomains: arrayProp("Exclude results from these domains", {
      type: "string",
    }),
    startPublishedDate: stringProp(
      "Filter to content published after this date (ISO 8601 format)"
    ),
    endPublishedDate: stringProp(
      "Filter to content published before this date (ISO 8601 format)"
    ),
    includeText: booleanProp("Include full text content in results", true),
    includeHighlights: booleanProp(
      "Include highlighted relevant excerpts",
      true
    ),
    includeSummary: booleanProp(
      "Include AI-generated summary for each result",
      false
    ),
  },
  ["query"]
);

// ============================================================================
// TYPES
// ============================================================================

type SearchType = (typeof SEARCH_TYPES)[number];
type Category = (typeof CATEGORIES)[number];

export interface ExaSearchInput {
  query: string;
  numResults?: number;
  type?: SearchType;
  useAutoprompt?: boolean;
  category?: Category;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  includeText?: boolean;
  includeHighlights?: boolean;
  includeSummary?: boolean;
}

interface ExaSearchResult {
  url: string;
  title: string;
  text?: string;
  highlights?: string[];
  highlightScores?: number[];
  summary?: string;
  publishedDate?: string;
  author?: string;
  score?: number;
}

interface ExaSearchResponse {
  requestId: string;
  autopromptString?: string;
  results: ExaSearchResult[];
}

interface FormattedResult {
  title: string;
  url: string;
  excerpt: string;
  publishedDate?: string;
  score?: number;
}

export interface ExaSearchOutput {
  query: string;
  optimizedQuery?: string;
  resultCount: number;
  results: FormattedResult[];
}

// ============================================================================
// API CLIENT
// ============================================================================

async function callExaApi(
  endpoint: string,
  body: Record<string, UntypedJson>
): Promise<ExaSearchResponse> {
  const apiKey = process.env.EXA_API_KEY;

  if (!apiKey) {
    throw new Error("EXA_API_KEY environment variable is not configured");
  }

  const response = await fetch(`${EXA_API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Exa API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// ============================================================================
// HELPERS
// ============================================================================

function formatExcerpt(result: ExaSearchResult): string {
  // Prefer highlights (most relevant excerpts)
  if (result.highlights && result.highlights.length > 0) {
    return result.highlights.slice(0, 2).join(" ... ");
  }

  // Fall back to summary
  if (result.summary) {
    return result.summary.slice(0, 500);
  }

  // Fall back to text
  if (result.text) {
    return result.text.slice(0, 500);
  }

  return "No excerpt available";
}

// ============================================================================
// TOOL
// ============================================================================

export const exaWebSearchTool = createTool<ExaSearchInput, ExaSearchOutput>({
  description: `Search the web using Exa's neural search for comprehensive research.
Best for: crypto news, DeFi protocols, market research, technical documentation.
Supports: semantic search, date filtering, domain filtering, content extraction.
Use this tool when the user asks to search the web, research a topic, or find recent news.`,

  schema: exaSearchSchema,

  execute: async (input: ExaSearchInput): Promise<ExaSearchOutput> => {
    const {
      query,
      numResults = 10,
      type = "auto",
      useAutoprompt = true,
      category,
      includeDomains,
      excludeDomains,
      startPublishedDate,
      endPublishedDate,
      includeText = true,
      includeHighlights = true,
      includeSummary = false,
    } = input;

    // Build request body
    const requestBody: Record<string, UntypedJson> = {
      query,
      numResults,
      type,
      useAutoprompt,
      contents: {
        text: includeText,
        highlights: includeHighlights,
        summary: includeSummary,
      },
    };

    if (category) requestBody.category = category;
    if (includeDomains?.length) requestBody.includeDomains = includeDomains;
    if (excludeDomains?.length) requestBody.excludeDomains = excludeDomains;
    if (startPublishedDate) requestBody.startPublishedDate = startPublishedDate;
    if (endPublishedDate) requestBody.endPublishedDate = endPublishedDate;

    // Call Exa API
    const response = await callExaApi("/search", requestBody);

    // Format results
    const formattedResults = response.results.map((result) => ({
      title: result.title,
      url: result.url,
      excerpt: formatExcerpt(result),
      publishedDate: result.publishedDate,
      score: result.score,
    }));

    return {
      query,
      optimizedQuery: response.autopromptString,
      resultCount: formattedResults.length,
      results: formattedResults,
    };
  },
});

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick search helper for internal use.
 */
export async function searchWithExa(
  query: string,
  options?: Partial<ExaSearchInput>
): Promise<ExaSearchOutput | null> {
  const input: ExaSearchInput = {
    query,
    numResults: options?.numResults ?? 5,
    type: options?.type ?? "auto",
    useAutoprompt: options?.useAutoprompt ?? true,
    includeText: options?.includeText ?? true,
    includeHighlights: options?.includeHighlights ?? true,
    includeSummary: options?.includeSummary ?? false,
    ...options,
  };

  try {
    if (!exaWebSearchTool.execute) {
      logger.error("[searchWithExa] Tool execute function is undefined");
      return null;
    }
    return await resolveToolExecutionResult(
      exaWebSearchTool.execute(input, {
        toolCallId: `exa-${Date.now()}`,
        messages: [],
      }),
    );
  } catch (error) {
    logger.error("[searchWithExa] Failed:", error);
    return null;
  }
}

/**
 * Check if Exa is configured.
 */
export function isExaConfigured(): boolean {
  return Boolean(process.env.EXA_API_KEY);
}
