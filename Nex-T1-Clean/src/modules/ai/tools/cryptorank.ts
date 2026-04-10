/**
 * CryptoRank Tool
 * 
 * Domain: AI Tools - Market Data
 * Responsibility: Query CryptoRank v2 API endpoints
 * Notes: Modernized to use AI SDK 5.0 native tool pattern with JSON Schema.
 */

import { createTool, createToolSchema, enumProp, stringProp, integerProp, objectProp } from "./create-tool";
import type { JSONSchema7 } from "json-schema";
import { runToolSpan } from "@/lib/observability/sentry";
import { invokeCryptorankEndpoint, createCryptorankClient } from "@/server/cryptorank";
import { parseCryptorankInvocation } from "@/server/cryptorank/schema";
import {
  CRYPTORANK_ENDPOINT_IDS,
  getEndpointDefinition,
  type CryptorankEndpointId,
} from "@/server/cryptorank/metadata";

// ============================================================================
// TYPES
// ============================================================================

export interface CryptorankToolInput {
  endpoint: CryptorankEndpointId;
  params?: Record<string, UntypedJson>;
  overrides?: {
    baseUrl?: string;
    apiKey?: string;
    timeoutMs?: number;
    maxRetries?: number;
  };
}

interface CryptorankOutput {
  endpoint?: string;
  path?: string;
  tag?: string;
  summary?: string;
  description?: string;
  params?: Record<string, UntypedJson>;
  requestedAt?: string;
  creditsDeclared?: number | null;
  usedCredits?: number;
  data?: UntypedJson;
  raw?: UntypedJson;
  responseHeaders?: Record<string, string>;
  artifactHint?: { id: string; purpose: string };
  error?: string;
  statusCode?: number;
}

// ============================================================================
// SCHEMA
// ============================================================================

const overridesSchema: JSONSchema7 = objectProp("Override default client configuration", {
  baseUrl: stringProp("Custom base URL"),
  apiKey: stringProp("Custom API key", { minLength: 10 }),
  timeoutMs: integerProp("Timeout in milliseconds", { minimum: 1, maximum: 120000 }),
  maxRetries: integerProp("Maximum retry attempts", { minimum: 0, maximum: 5 }),
});

const cryptorankSchema = createToolSchema(
  {
    endpoint: enumProp("CryptoRank API endpoint to query", CRYPTORANK_ENDPOINT_IDS),
    params: {
      type: "object",
      description: "Parameters for the endpoint",
      additionalProperties: true,
    } as JSONSchema7,
    overrides: overridesSchema,
  },
  ["endpoint"],
  { additionalProperties: false },
);

// ============================================================================
// CONSTANTS
// ============================================================================

const ARTIFACT_HINTS: Record<string, { id: string; purpose: string }> = {
  Currencies: { id: "cryptorank_currencies_table", purpose: "table" },
  "Historical Data": { id: "cryptorank_historical_series", purpose: "chart-data" },
  Exchanges: { id: "cryptorank_exchanges_table", purpose: "table" },
  Funds: { id: "cryptorank_funds_table", purpose: "table" },
  Global: { id: "cryptorank_global_snapshot", purpose: "metrics" },
  Markets: { id: "cryptorank_markets_table", purpose: "table" },
  "Drophunting Activities": { id: "cryptorank_drophunting_tasks", purpose: "tasks" },
  Ecosystems: { id: "cryptorank_ecosystem_projects", purpose: "table" },
  Launchpads: { id: "cryptorank_launchpads_table", purpose: "table" },
  News: { id: "cryptorank_news_feed", purpose: "feed" },
  "Token Platforms": { id: "cryptorank_token_platforms", purpose: "reference" },
  General: { id: "cryptorank_generic_dataset", purpose: "dataset" },
};

// ============================================================================
// TOOL
// ============================================================================

export const cryptorankTool = createTool<CryptorankToolInput, CryptorankOutput>({
  description:
    "Query any CryptoRank v2 endpoint (currencies, exchanges, funds, global metrics, drophunting tasks, ecosystems, launchpads, news, token platforms) with automatic parameter validation, retry handling, and artifact hints.",
  schema: cryptorankSchema,
  execute: async (input: CryptorankToolInput): Promise<CryptorankOutput> => {
    try {
      const { endpoint, params, overrides } = input;
      const parsedEndpoint = await parseCryptorankInvocation({ endpoint, params });

      const spanContext = await runToolSpan("cryptorank", async (span) => {
        span.setAttribute("ai.tool.endpoint", parsedEndpoint.endpoint);
        span.setAttribute("ai.tool.cryptorank.params", JSON.stringify(parsedEndpoint.params ?? {}));
        if (overrides?.baseUrl) {
          span.setAttribute("ai.tool.cryptorank.override_base", overrides.baseUrl);
        }
        if (typeof overrides?.timeoutMs === "number") {
          span.setAttribute("ai.tool.cryptorank.timeout_ms", overrides.timeoutMs);
        }

        const client = overrides
          ? createCryptorankClient({
              baseUrl: overrides.baseUrl,
              apiKey: overrides.apiKey,
              timeoutMs: overrides.timeoutMs,
              maxRetries: overrides.maxRetries,
            })
          : undefined;

        const result = await invokeCryptorankEndpoint(
          { endpoint: parsedEndpoint.endpoint, params: parsedEndpoint.params },
          { client },
        );

        const definition = await getEndpointDefinition(result.endpoint);
        span.setAttribute("ai.tool.cryptorank.tag", definition.tag);

        return { result, definition };
      });

      const { result, definition } = spanContext;
      const { response } = result;

      if (!response.ok) {
        return {
          error: response.message,
          statusCode: response.statusCode,
        };
      }

      const success = response;
      const artifactHint = ARTIFACT_HINTS[definition.tag] ?? ARTIFACT_HINTS.General;

      return {
        endpoint: result.endpoint,
        path: definition.path,
        tag: definition.tag,
        summary: definition.summary,
        description: definition.description,
        params: result.params,
        requestedAt: result.requestedAt,
        creditsDeclared: definition.credits,
        usedCredits: success.usedCredits,
        data: success.data,
        raw: success.raw,
        responseHeaders: success.headers,
        artifactHint,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "CryptoRank tool invocation failed",
      };
    }
  },
});

// Export schema for backward compatibility
export { cryptorankSchema };
