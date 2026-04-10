/**
 * Market Intelligence Tool
 * 
 * Domain: AI Tools - Market Data Aggregation
 * Responsibility: Aggregate multi-source market intelligence
 * Notes: Modernized to use AI SDK 5.0 native tool pattern with JSON Schema.
 */

import {
  createTool,
  createToolSchema,
  stringProp,
  integerProp,
  enumProp,
  arrayProp,
} from "./create-tool";
import {
  ChainlinkMcpClient,
  type ChainlinkPriceFeedToolName,
} from "@/server/services/mcp/chainlink-client";
import {
  CryptoSentimentMcpClient,
  type CryptoSentimentToolName,
} from "@/server/services/mcp/crypto-sentiment-client";
import {
  DefiLlamaMcpClient,
  type DefiLlamaToolName,
} from "@/server/services/mcp/defillama-client";
import {
  BlocknativeMcpClient,
  type BlocknativeToolName,
} from "@/server/services/mcp/blocknative-client";
import {
  UniswapPoolSpyMcpClient,
  type UniswapPoolSpyToolName,
} from "@/server/services/mcp/uniswap-poolspy-client";
import {
  BinanceMcpClient,
  type BinanceToolName,
} from "@/server/services/mcp/binance-client";
import type { McpToolInvocationResult } from "@/server/services/mcp/base-client";
import { runToolSpan } from "@/lib/observability/sentry";

// ============================================================================
// CONSTANTS
// ============================================================================

const METRICS = ["price", "sentiment", "tvl", "gas", "liquidity"] as const;
const POOL_SORT_OPTIONS = ["tvl", "volume", "transactions", "timestamp"] as const;
const MARKET_INTELLIGENCE_SUBCALL_TIMEOUT_MS =
  Number.parseInt(process.env.MARKET_INTELLIGENCE_SUBCALL_TIMEOUT_MS ?? "", 10) || 4_000;
const MARKET_INTELLIGENCE_BINANCE_TIMEOUT_MS =
  Number.parseInt(process.env.MARKET_INTELLIGENCE_BINANCE_TIMEOUT_MS ?? "", 10) || 3_000;
const MARKET_INTELLIGENCE_SUBCALL_RETRIES =
  Number.parseInt(process.env.MARKET_INTELLIGENCE_SUBCALL_RETRIES ?? "", 10) || 0;

type Metric = (typeof METRICS)[number];

// ============================================================================
// TYPES
// ============================================================================

interface MarketIntelligenceInput {
  asset: string;
  quote?: string;
  chain?: string;
  metrics: Metric[];
  windowMinutes?: number;
  poolSort?: (typeof POOL_SORT_OPTIONS)[number];
  poolLimit?: number;
}

interface MarketIntelligenceOutput {
  asset?: string;
  quote?: string;
  chain?: string | null;
  windowMinutes?: number;
  metrics?: Record<string, UntypedJson>;
  error?: string;
}

type SupportedMarketToolName =
  | ChainlinkPriceFeedToolName
  | CryptoSentimentToolName
  | DefiLlamaToolName
  | BlocknativeToolName
  | UniswapPoolSpyToolName
  | BinanceToolName;

type SupportedInvocationResult = McpToolInvocationResult<SupportedMarketToolName>;

const marketIntelligenceClients = {
  chainlink: new ChainlinkMcpClient({
    requestTimeoutMs: MARKET_INTELLIGENCE_SUBCALL_TIMEOUT_MS,
    maxRetries: MARKET_INTELLIGENCE_SUBCALL_RETRIES,
  }),
  sentiment: new CryptoSentimentMcpClient({
    requestTimeoutMs: MARKET_INTELLIGENCE_SUBCALL_TIMEOUT_MS,
    maxRetries: MARKET_INTELLIGENCE_SUBCALL_RETRIES,
  }),
  defiLlama: new DefiLlamaMcpClient({
    requestTimeoutMs: MARKET_INTELLIGENCE_SUBCALL_TIMEOUT_MS,
    maxRetries: MARKET_INTELLIGENCE_SUBCALL_RETRIES,
  }),
  blocknative: new BlocknativeMcpClient({
    requestTimeoutMs: MARKET_INTELLIGENCE_SUBCALL_TIMEOUT_MS,
    maxRetries: MARKET_INTELLIGENCE_SUBCALL_RETRIES,
  }),
  poolSpy: new UniswapPoolSpyMcpClient({
    requestTimeoutMs: MARKET_INTELLIGENCE_SUBCALL_TIMEOUT_MS,
    maxRetries: MARKET_INTELLIGENCE_SUBCALL_RETRIES,
  }),
  binance: new BinanceMcpClient({
    requestTimeoutMs: MARKET_INTELLIGENCE_BINANCE_TIMEOUT_MS,
    maxRetries: MARKET_INTELLIGENCE_SUBCALL_RETRIES,
  }),
};

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function resolveInvocationPayload(
  result: PromiseSettledResult<SupportedInvocationResult>,
  fallback: string,
): UntypedJson {
  if (result.status === "rejected") {
    return { error: toErrorMessage(result.reason, fallback) };
  }

  if (!result.value.ok) {
    return { error: result.value.text || fallback };
  }

  return result.value.toolResult ?? result.value.text;
}

function payloadHasError(value: UntypedJson): boolean {
  return typeof value === "object" && value !== null && "error" in value;
}

function markMetricDegraded(args: {
  metric: string;
  payloads: UntypedJson[];
  errors: string[];
  span: { setAttribute: (key: string, value: string | number | boolean) => void };
}): void {
  if (!args.payloads.some(payloadHasError)) {
    return;
  }

  args.errors.push(args.metric);
  args.span.setAttribute(`ai.tool.metric.${args.metric}.error`, true);
}

// ============================================================================
// SCHEMA
// ============================================================================

const marketIntelligenceSchema = createToolSchema(
  {
    asset: stringProp("Asset symbol (e.g., ETH, BTC)", { minLength: 1 }),
    quote: stringProp("Optional quote asset for price lookups (default USD)"),
    chain: stringProp("Optional chain/network identifier (e.g., ethereum, base)"),
    metrics: arrayProp(
      "Select at least one metric to retrieve",
      enumProp("Metric type", METRICS),
      { minItems: 1 },
    ),
    windowMinutes: integerProp("Time window for sentiment/liquidity analysis in minutes", {
      minimum: 1,
      maximum: 1440,
      default: 60,
    }),
    poolSort: enumProp("Pool sorting criteria", POOL_SORT_OPTIONS, "tvl"),
    poolLimit: integerProp("Maximum pools to return", { minimum: 1, maximum: 100, default: 20 }),
  },
  ["asset", "metrics"],
);

// ============================================================================
// TOOL
// ============================================================================

export const marketIntelligenceTool = createTool<MarketIntelligenceInput, MarketIntelligenceOutput>(
  {
    description:
      "Aggregate multi-source market intelligence by orchestrating Chainlink, Binance, Blocknative, DeFiLlama, PoolSpy, and Santiment MCP servers.",
    schema: marketIntelligenceSchema,
    execute: async (input: MarketIntelligenceInput): Promise<MarketIntelligenceOutput> => {
      const {
        asset,
        quote = "USD",
        chain,
        metrics,
        windowMinutes = 60,
        poolSort = "tvl",
        poolLimit = 20,
      } = input;

      const normalizedAsset = asset.toUpperCase();
      const normalizedQuote = quote.toUpperCase();

      try {
        const aggregated = await runToolSpan("market_intelligence", async (span) => {
          span.setAttribute("ai.tool.asset", normalizedAsset);
          span.setAttribute("ai.tool.quote", normalizedQuote);
          span.setAttribute("ai.tool.metrics.requested", metrics.length);
          span.setAttribute("ai.tool.window_minutes", windowMinutes);
          span.setAttribute("ai.tool.pool.limit", poolLimit);
          span.setAttribute("ai.tool.pool.sort", poolSort);
          if (chain) {
            span.setAttribute("ai.tool.chain", chain);
          }

          const results: Record<string, UntypedJson> = {};
          const errors: string[] = [];

          const recordMetricError = (metric: string, error: UntypedJson, fallback: string) => {
            const message = error instanceof Error ? error.message : fallback;
            errors.push(metric);
            span.setAttribute(`ai.tool.metric.${metric}.error`, true);
            return message;
          };

          const tasks: Promise<void>[] = [];

          if (metrics.includes("price")) {
            tasks.push(
              (async () => {
                const [chainlinkResult, binanceResult] = await Promise.allSettled([
                  marketIntelligenceClients.chainlink.invokeRaw("getLatestPrice", {
                    pair: `${normalizedAsset}/${normalizedQuote}`,
                    chain: chain ?? "ethereum",
                  }),
                  marketIntelligenceClients.binance.invokeRaw("get_market_data", {
                    symbol: `${normalizedAsset}${normalizedQuote}`,
                    type: "spot",
                  }),
                ]);

                const pricePayload = {
                  chainlink: resolveInvocationPayload(
                    chainlinkResult,
                    "Failed to fetch Chainlink price",
                  ),
                  binance: resolveInvocationPayload(
                    binanceResult,
                    "Failed to fetch Binance market data",
                  ),
                };

                markMetricDegraded({
                  metric: "price",
                  payloads: [pricePayload.chainlink, pricePayload.binance],
                  errors,
                  span,
                });
                results.price = pricePayload;
              })(),
            );
          }

          if (metrics.includes("sentiment")) {
            tasks.push(
              (async () => {
                const lookbackDays = Math.max(windowMinutes / 60, 1);
                const [sentimentResult, dominanceResult, trendingResult] =
                  await Promise.allSettled([
                    marketIntelligenceClients.sentiment.invokeRaw(
                      "get_sentiment_balance",
                      { asset: normalizedAsset, days: lookbackDays },
                    ),
                    marketIntelligenceClients.sentiment.invokeRaw(
                      "get_social_dominance",
                      { asset: normalizedAsset, days: lookbackDays },
                    ),
                    marketIntelligenceClients.sentiment.invokeRaw(
                      "get_trending_words",
                      { days: lookbackDays, top_n: 10 },
                    ),
                  ]);

                const sentimentPayload = {
                  sentiment: resolveInvocationPayload(
                    sentimentResult,
                    "Failed to fetch sentiment balance",
                  ),
                  dominance: resolveInvocationPayload(
                    dominanceResult,
                    "Failed to fetch social dominance",
                  ),
                  trending: resolveInvocationPayload(
                    trendingResult,
                    "Failed to fetch trending words",
                  ),
                };

                markMetricDegraded({
                  metric: "sentiment",
                  payloads: [
                    sentimentPayload.sentiment,
                    sentimentPayload.dominance,
                    sentimentPayload.trending,
                  ],
                  errors,
                  span,
                });
                results.sentiment = sentimentPayload;
              })(),
            );
          }

          if (metrics.includes("tvl")) {
            tasks.push(
              (async () => {
                const tvlRequests: Array<Promise<SupportedInvocationResult>> = [
                  marketIntelligenceClients.defiLlama.invokeRaw("get_protocol_tvl", {
                    protocol: normalizedAsset.toLowerCase(),
                  }),
                ];

                if (chain) {
                  tvlRequests.push(
                    marketIntelligenceClients.defiLlama.invokeRaw("get_chain_tvl", {
                      chain,
                    }),
                  );
                }

                const [protocolTvlResult, chainTvlResult] = await Promise.allSettled(tvlRequests);
                const tvlPayload = {
                  protocol: resolveInvocationPayload(
                    protocolTvlResult,
                    "Failed to fetch protocol TVL",
                  ),
                  chain: chainTvlResult
                    ? resolveInvocationPayload(chainTvlResult, "Failed to fetch chain TVL")
                    : null,
                };

                markMetricDegraded({
                  metric: "tvl",
                  payloads: tvlPayload.chain ? [tvlPayload.protocol, tvlPayload.chain] : [tvlPayload.protocol],
                  errors,
                  span,
                });
                results.tvl = tvlPayload;
              })(),
            );
          }

          if (metrics.includes("gas")) {
            tasks.push(
              (async () => {
                try {
                  const gas = await marketIntelligenceClients.blocknative.invokeRaw("predict_gas_price", {
                    chain_id: chain ? Number.parseInt(chain, 10) || 1 : 1,
                  });
                  const gasPayload = gas.ok ? gas.toolResult ?? gas.text : { error: gas.text || "Failed to fetch gas" };
                  if (payloadHasError(gasPayload)) {
                    errors.push("gas");
                    span.setAttribute("ai.tool.metric.gas.error", true);
                  }
                  results.gas = gasPayload;
                } catch (error) {
                  results.gas = {
                    error: recordMetricError("gas", error, "Failed to fetch gas"),
                  };
                }
              })(),
            );
          }

          if (metrics.includes("liquidity")) {
            tasks.push(
              (async () => {
                try {
                  const pools = await marketIntelligenceClients.poolSpy.invokeRaw("get_new_pools", {
                    chain: chain ?? "base",
                    order_by: poolSort,
                    time_range_seconds: windowMinutes * 60,
                    limit: poolLimit,
                  });

                  const liquidityPayload = pools.ok
                    ? pools.toolResult ?? pools.text
                    : { error: pools.text || "Failed to fetch liquidity data" };
                  if (payloadHasError(liquidityPayload)) {
                    errors.push("liquidity");
                    span.setAttribute("ai.tool.metric.liquidity.error", true);
                  }
                  results.liquidity = liquidityPayload;
                } catch (error) {
                  results.liquidity = {
                    error: recordMetricError("liquidity", error, "Failed to fetch liquidity data"),
                  };
                }
              })(),
            );
          }

          await Promise.all(tasks);

          span.setAttribute("ai.tool.metrics.error_count", errors.length);

          return {
            asset: normalizedAsset,
            quote: normalizedQuote,
            chain: chain ?? null,
            windowMinutes,
            metrics: results,
          };
        });

        return aggregated;
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Market intelligence aggregation failed",
        };
      }
    },
  },
);

// Export schema for backward compatibility
export { marketIntelligenceSchema };
