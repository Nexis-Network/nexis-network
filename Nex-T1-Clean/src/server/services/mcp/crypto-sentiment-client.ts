import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  McpInvocationError,
  type McpToolInvocationResult,
} from "./base-client";
import {
  getSantimentSentiment,
  getSantimentWordCloud,
} from "@/lib/vendors/santiment";
import { logger } from "@/lib/logger";

export type CryptoSentimentToolName =
  | "get_sentiment_balance"
  | "get_social_volume"
  | "alert_social_shift"
  | "get_trending_words"
  | "get_social_dominance";

export type CryptoSentimentClientOptions = HttpMcpClientOptions;

const DEFAULT_BASE_URL =
  process.env.MCP_CRYPTO_SENTIMENT_BASE_URL ?? "https://sentiment.nex-t1.ai";

const ASSET_SLUG_OVERRIDES: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  DOGE: "dogecoin",
  ADA: "cardano",
  SUI: "sui",
  HYPE: "hyperliquid",
};

function buildFallbackResult(
  tool: CryptoSentimentToolName,
  toolResult: UntypedJson,
  text: string,
): McpToolInvocationResult<CryptoSentimentToolName> {
  return {
    ok: true,
    text,
    response: {
      content: [{ type: "text", text }],
      toolResult,
    },
    toolResult,
    tool,
  };
}

function normalizeAssetSlug(rawAsset: UntypedJson): string | null {
  if (typeof rawAsset !== "string") return null;
  const value = rawAsset.trim();
  if (!value || /^0x[a-fA-F0-9]{40}$/.test(value)) {
    return null;
  }

  const upper = value.toUpperCase();
  return ASSET_SLUG_OVERRIDES[upper] ?? value.toLowerCase().replace(/\s+/g, "-");
}

function resolveDateRange(args: Record<string, UntypedJson>): { from: string; to: string; days: number } {
  const daysRaw = typeof args.days === "number" ? args.days : Number(args.days ?? 7);
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(Math.floor(daysRaw), 30) : 7;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    days,
  };
}

export class CryptoSentimentMcpClient extends HttpMcpClient<CryptoSentimentToolName> {
  constructor(options: CryptoSentimentClientOptions = {}) {
    super(
      {
        baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
        apiKey: options.apiKey ?? process.env.MCP_CRYPTO_SENTIMENT_API_KEY,
        requestTimeoutMs: options.requestTimeoutMs,
        maxRetries: options.maxRetries,
        defaultHeaders: options.defaultHeaders,
        name: "Crypto Sentiment MCP",
      },
    );
  }

  private async invokeVendorFallback(
    tool: CryptoSentimentToolName,
    args: Record<string, UntypedJson>,
    cause: unknown,
  ): Promise<McpToolInvocationResult<CryptoSentimentToolName>> {
    const assetSlug = normalizeAssetSlug(args.asset ?? args.query ?? args.symbol ?? null);
    if (!assetSlug) {
      const message =
        cause instanceof Error ? cause.message : "crypto_sentiment_vendor_fallback_unavailable";
      return {
        ok: false,
        text: message,
        response: { content: [{ type: "text", text: message }], isError: true },
        tool,
      };
    }

    const { from, to, days } = resolveDateRange(args);
    logger.warn("[crypto-sentiment] falling back to Santiment vendor API", {
      tool,
      assetSlug,
      reason: cause instanceof Error ? cause.message : String(cause),
    });

    switch (tool) {
      case "get_sentiment_balance": {
        const response = await getSantimentSentiment(assetSlug, from, to, "1d", 60);
        const socialDominance = response.data.data.socialDominance;
        const sentimentWeightedCombined = response.data.data.sentimentWeightedCombined;
        const toolResult = {
          source: "santiment_vendor_fallback",
          asset: assetSlug,
          days,
          latest: {
            socialDominance: socialDominance.at(-1)?.value ?? null,
            sentimentWeightedCombined: sentimentWeightedCombined.at(-1)?.value ?? null,
          },
          socialDominance,
          sentimentWeightedCombined,
        } satisfies UntypedJson;
        return buildFallbackResult(
          tool,
          toolResult,
          `Loaded Santiment fallback sentiment for ${assetSlug}.`,
        );
      }
      case "get_social_dominance": {
        const response = await getSantimentSentiment(assetSlug, from, to, "1d", 60);
        const socialDominance = response.data.data.socialDominance;
        const toolResult = {
          source: "santiment_vendor_fallback",
          asset: assetSlug,
          days,
          latest: socialDominance.at(-1)?.value ?? null,
          series: socialDominance,
        } satisfies UntypedJson;
        return buildFallbackResult(
          tool,
          toolResult,
          `Loaded Santiment fallback social dominance for ${assetSlug}.`,
        );
      }
      case "get_trending_words": {
        const response = await getSantimentWordCloud(
          assetSlug,
          from,
          to,
          "TELEGRAM_CHATS",
          60,
        );
        const toolResult = {
          source: "santiment_vendor_fallback",
          asset: assetSlug,
          days,
          wordsCloud: response.data.data.wordsCloud,
        } satisfies UntypedJson;
        return buildFallbackResult(
          tool,
          toolResult,
          `Loaded Santiment fallback trending words for ${assetSlug}.`,
        );
      }
      default: {
        const message =
          cause instanceof Error ? cause.message : "crypto_sentiment_vendor_fallback_unavailable";
        return {
          ok: false,
          text: message,
          response: { content: [{ type: "text", text: message }], isError: true },
          tool,
        };
      }
    }
  }

  async invoke(
    tool: CryptoSentimentToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<CryptoSentimentToolName>> {
    const result = await this.invokeRaw(tool, args);
    if (!result.ok) {
      throw new McpInvocationError(
        `Crypto Sentiment MCP tool ${tool} failed: ${result.text}`,
        undefined,
        result,
      );
    }
    return result;
  }

  async invokeRaw(
    tool: CryptoSentimentToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<CryptoSentimentToolName>> {
    try {
      const result = await super.invokeRaw(tool, args);
      if (result.ok) {
        return result;
      }
      return await this.invokeVendorFallback(tool, args, result.text);
    } catch (error) {
      return await this.invokeVendorFallback(tool, args, error);
    }
  }
}

export const defaultCryptoSentimentClient = new CryptoSentimentMcpClient();
