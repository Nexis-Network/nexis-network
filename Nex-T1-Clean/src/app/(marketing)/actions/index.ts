"use server";

import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { createStreamableValue } from "@/modules/ai/read-streamable-value";
import { generateObject, generateText, streamObject, streamText } from "ai";

import {
  buildSnapshotSummary,
  getPythMarketSnapshot,
  type CryptoHeadline,
  type PythMarketSnapshot,
} from "@/modules/prices/pyth/market";
import { getNftDetails, getNftMarketChart, searchAssets } from "@/server/market/coingecko";
import type { NftCollectionDetails, NftMarketChart } from "@/types/market";
import { getEvmHottestNftCollectionsByVolume, getEvmTopNftCollectionsByMarketCap } from "@/server/moralis/evm/market";
import { toNumber } from "@/server/moralis/utils";
import { getSwapQuote } from "@/lib/swap-aggregator";
import { SwapAggregatorError } from "@/lib/swap-aggregator-error";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { openai } from "@/server/services/ai-sdk/openai";
import { getErrorMessage } from "@/lib/utils/error";
import { AIAgentSchema } from "@/lib/schema";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { ensureSwapWalletGuards } from "@/modules/wallets/swap-guard";


import { logger } from '@/lib/logger';
const preferGpt5 = process.env.NEX_PREFER_GPT5 !== "false";
const LEGACY_DEFAULT_MODEL =
  process.env.NEX_LEGACY_MODEL ??
  process.env.NEX_BASE_CHAT_MODEL ??
  process.env.NEX_BALANCED_MODEL ??
  "gpt-5.4";
const REASONING_DEFAULT_MODEL = process.env.NEX_REASONING_MODEL ?? "gpt-5.4";
const DEFAULT_AGENT_IDEA_MODEL =
  process.env.NEX_AGENT_IDEA_MODEL ?? (preferGpt5 ? REASONING_DEFAULT_MODEL : LEGACY_DEFAULT_MODEL);
const DEFAULT_TEXT_MODEL = process.env.NEX_TEXT_MODEL ?? LEGACY_DEFAULT_MODEL;

const stripProviderPrefix = (modelId: string) => {
  if (!modelId) {
    return modelId;
  }
  const slashIndex = modelId.indexOf("/");
  if (slashIndex === -1) {
    return modelId;
  }
  return modelId.slice(slashIndex + 1);
};

const allowsSampling = (modelId: string) => !stripProviderPrefix(modelId).startsWith("gpt-5.4");

type StreamPythInput = {
  ticker?: string;
  /**
   * Optional free-form query (e.g. "dogecoin price") used to resolve a CoinGecko
   * symbol → Pyth ticker when an explicit ticker isn't provided.
   */
  query?: string;
  lookbackDays?: number;
  resolutionMinutes?: number;
};

function normalizePythTicker(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!trimmed.includes("/")) {
    const symbol = trimmed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!symbol) return null;
    return `${symbol}/USD`;
  }
  const [baseRaw, quoteRaw] = trimmed.split("/", 2);
  const base = (baseRaw ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const quote = (quoteRaw ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "USD";
  if (!base) return null;
  return `${base}/${quote}`;
}

async function resolveTickerFromQuery(query: string): Promise<string | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const search = await searchAssets(trimmed);
  const coins = search.data?.coins ?? [];
  if (!coins.length) return null;

  const q = trimmed.toLowerCase();
  const exactSymbol = coins.find((coin) => coin.symbol?.toLowerCase() === q) ?? null;
  const exactName = coins.find((coin) => coin.name?.toLowerCase() === q) ?? null;
  const bestByRank = [...coins].sort((a, b) => {
    const aRank = typeof a.marketCapRank === "number" ? a.marketCapRank : Number.POSITIVE_INFINITY;
    const bRank = typeof b.marketCapRank === "number" ? b.marketCapRank : Number.POSITIVE_INFINITY;
    return aRank - bRank;
  })[0] ?? null;

  const best = exactSymbol ?? exactName ?? bestByRank;
  const symbol = best?.symbol?.trim();
  if (!symbol) return null;

  return normalizePythTicker(symbol);
}

export async function streamPythMarketAction({
  ticker,
  query,
  lookbackDays = 7,
  resolutionMinutes = 15,
}: StreamPythInput) {
  const ui = createStreamableValue<ReactNode>();
  const normalizedTicker = normalizePythTicker(ticker ?? "") ?? (query ? await resolveTickerFromQuery(query) : null);
  let snapshot: PythMarketSnapshot | null = null;
  let error: string | null = null;
  let news: CryptoHeadline[] = [];

  try {
    if (!normalizedTicker) {
      throw new Error("Unable to resolve a supported ticker for the requested asset.");
    }
    const { snapshot: computedSnapshot, news: computedNews, error: snapshotError } =
      await getPythMarketSnapshot({
        ticker: normalizedTicker,
        lookbackDays,
        resolutionMinutes,
      });

    if (!computedSnapshot) {
      throw new Error(snapshotError ?? `Unable to load market data for ${normalizedTicker}`);
    }

    snapshot = computedSnapshot;
    news = computedNews;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load Pyth market data";
    ui.update(null);
  }
  ui.done();

  return {
    ui: ui.value,
    snapshot,
    error,
    news,
  };
}

type StreamNftInput = {
  /** CoinGecko NFT id/slug, or a free-form search query (e.g. "Bored Ape Yacht Club") */
  query: string;
  days?: number;
  vsCurrency?: string;
};

export type NftMarketPayload = {
  type: "nft-chart";
  id: string;
  name: string;
  symbol: string;
  imageUrl?: string | null;
  floorPriceUsd?: number | null;
  floorPriceChangePct24h?: number | null;
  volume24hUsd?: number | null;
  marketCapUsd?: number | null;
  transactions24h?: number | null;
  summary?: string | null;
  lastUpdated?: string | null;
  chart?: NftMarketChart | null;
  error?: string | null;
};

function stripHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toBriefSummary(raw: string | null | undefined, maxSentences = 2): string | null {
  if (!raw) return null;
  const cleaned = stripHtml(raw);
  if (!cleaned) return null;
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!sentences.length) return null;
  return sentences.slice(0, Math.max(1, Math.min(maxSentences, 2))).join(" ");
}

function resolveNftFloorChangePct(details: NftCollectionDetails, moralisPct?: number | null): number | null {
  if (typeof moralisPct === "number" && Number.isFinite(moralisPct)) {
    return moralisPct;
  }
  const floor = details.floorPriceUsd ?? null;
  const avg = details.oneDayAveragePriceUsd ?? null;
  if (floor == null || avg == null || !Number.isFinite(floor) || !Number.isFinite(avg) || avg === 0) {
    return null;
  }
  return ((floor - avg) / avg) * 100;
}

async function resolveMoralisNftFloorChangePct(name: string): Promise<number | null> {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;

  const [byCap, byVolume] = await Promise.allSettled([
    getEvmTopNftCollectionsByMarketCap(),
    getEvmHottestNftCollectionsByVolume(),
  ]);

  const pools = [
    ...(byCap.status === "fulfilled" ? byCap.value : []),
    ...(byVolume.status === "fulfilled" ? byVolume.value : []),
  ];

  for (const entry of pools) {
    const title = String((entry as UntypedJson)?.collection_title ?? "").trim().toLowerCase();
    if (!title) continue;
    if (title === normalized) {
      return toNumber((entry as UntypedJson)?.floor_price_24hr_percent_change) ?? null;
    }
  }

  return null;
}

async function resolveNftId(query: string): Promise<string | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // If the user already provided an id-like slug, try it directly.
  if (/^[a-z0-9][a-z0-9-]{2,120}$/i.test(trimmed) && !/\s/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  const search = await searchAssets(trimmed);
  const nfts = search.data?.nfts ?? [];
  const best = nfts[0];
  return best?.id ?? best?.slug ?? null;
}

export async function streamNftMarketAction({
  query,
  days = 30,
  vsCurrency = "usd",
}: StreamNftInput) {
  const id = await resolveNftId(query);
  if (!id) {
    return {
      payload: null,
      error: "No matching NFT collection found on CoinGecko.",
    } as const;
  }

  try {
    const [detailsResponse, chartResponse] = await Promise.all([
      getNftDetails(id),
      getNftMarketChart(id, { vsCurrency, days }).catch(() => null),
    ]);

    const details = detailsResponse.data;
    const moralisFloorChange = await resolveMoralisNftFloorChangePct(details.name).catch(() => null);

    const payload: NftMarketPayload = {
      type: "nft-chart",
      id,
      name: details.name,
      symbol: details.symbol,
      imageUrl: details.imageUrl ?? null,
      floorPriceUsd: details.floorPriceUsd ?? null,
      floorPriceChangePct24h: resolveNftFloorChangePct(details, moralisFloorChange),
      volume24hUsd: details.volume24hUsd ?? null,
      marketCapUsd: details.marketCapUsd ?? null,
      transactions24h: details.oneDaySales ?? null,
      summary: toBriefSummary(details.description),
      lastUpdated: details.lastUpdated ?? null,
      chart: chartResponse?.data ?? null,
      error: null,
    };

    return { payload, error: null } as const;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load NFT market data.";
    return {
      payload: null,
      error: message,
    } as const;
  }
}

export async function streamAgentIdeasAction() {
  const stream = createStreamableValue();

  (async () => {
    try {
      const { elementStream } = streamObject({
        output: "array",
        schema: AIAgentSchema,
        model: openai(DEFAULT_AGENT_IDEA_MODEL),
        system:
          "You are Nex an expert AI companion and Web3 expert specializing in innovative AI agents. Generate ideas that are technically feasible with current AI technology and have clear market potential.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Generate 3 innovative AI agent ideas with their details.",
              },
            ],
          },
          {
            role: "assistant",
            content: [
              {
                type: "text",
                text: JSON.stringify([
                  {
                    name: "Creative Writing Mentor",
                    tagline: "Your personal writing coach powered by AI",
                    description:
                      "An AI agent that provides real-time feedback and suggestions while you write, helping improve your writing style and storytelling.",
                    useCase:
                      "Aspiring writers and content creators looking to improve their craft",
                    features: [
                      "Real-time style and grammar feedback",
                      "Story structure analysis",
                      "Character development suggestions",
                      "Genre-specific writing tips",
                    ],
                    uniqueValue:
                      "Combines writing analysis with personalized coaching and learning path",
                  },
                ]),
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Now generate 3 unique AI agent ideas that haven't been widely explored yet. Focus on practical applications that could be built today.",
              },
            ],
          },
        ],
      });

      for await (const element of elementStream) {
        stream.update(element);
      }
    } catch (error) {
      logger.error("streamAgentIdeasAction: failed to stream agent ideas", error);
    } finally {
      stream.done();
    }
  })();
  return { array: stream.value };
}

export async function createCheckoutSession(
  priceId: string,
): Promise<{ url: string } | { error: string }> {
  if (!priceId) {
    return { error: "Missing Stripe price ID." };
  }

  if (!isStripeConfigured()) {
    return {
      error:
        "Stripe is not configured. Set STRIPE_BLOCK_SECRET_KEY or STRIPE_SECRET_KEY to enable this demo.",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/success`,
      cancel_url: `${baseUrl}/registry/blocks/stripe-upstash-subscription/app`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return { error: "Stripe did not return a checkout URL." };
    }

    return { url: session.url };
  } catch (error) {
    logger.error("createCheckoutSession failed", error);
    return {
      error: getErrorMessage(error, "Unable to create Stripe checkout session."),
    };
  }
}

export async function generateAgentIdeaAction(topic?: string) {
  const { object } = await generateObject({
    model: openai(DEFAULT_AGENT_IDEA_MODEL),
    schema: AIAgentSchema,
    system:
      "You are a visionary AI product designer who creates groundbreaking AI agent concepts. Generate detailed, well-thought-out ideas that are technically feasible and commercially viable.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Generate a detailed AI agent concept for the education sector.",
          },
        ],
      },
      {
        role: "assistant",
        content: [
          {
            type: "text",
            text: JSON.stringify({
              name: "StudyPathPro",
              tagline: "Personalized learning journeys powered by AI",
              description:
                "An adaptive learning system that creates personalized study paths based on individual learning styles, goals, and progress.",
              useCase:
                "Students and lifelong learners seeking efficient, personalized education",
              features: [
                "Learning style assessment",
                "Adaptive content sequencing",
                "Progress tracking and adjustment",
                "Resource recommendation engine",
              ],
              techStack: [
                "Machine Learning",
                "Natural Language Processing",
                "Educational Content APIs",
                "Analytics Engine",
              ],
              businessModel:
                "B2B2C through educational institutions with direct consumer options",
              uniqueValue:
                "Truly personalized learning paths that adapt in real-time to student progress",
              marketPotential: 9,
              implementationComplexity: 7,
            }),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              topic && topic.trim().length > 0
                ? `Generate a unique AI agent concept that hasn't been widely explored yet. Make it detailed and commercially viable. Anchor it to this focus: ${topic}.`
                : "Generate a unique AI agent concept that hasn't been widely explored yet. Make it detailed and commercially viable.",
          },
        ],
      },
    ],
  });
  return { object };
}

export async function generateTextAction(promptOverride?: string) {
  const samplingOptions = allowsSampling(DEFAULT_TEXT_MODEL)
    ? { temperature: 0.7 }
    : {};

  const { text } = await generateText({
    model: openai(DEFAULT_TEXT_MODEL),
    maxOutputTokens: 100,
    ...samplingOptions,
    prompt:
      promptOverride?.trim() && promptOverride.length > 0
        ? promptOverride
        : "You think deeply using first principles, and predict the market potential and future of AI agents. In one sentence, describe the market potential and future of AI agents.",
  });
  return { text };
}

export async function streamTextAction() {
  const stream = createStreamableValue();

  (async () => {
    try {
      const samplingOptions = allowsSampling(DEFAULT_TEXT_MODEL)
        ? { temperature: 0.8 }
        : {};

      const { textStream } = streamText({
        model: openai(DEFAULT_TEXT_MODEL),
        maxOutputTokens: 100,
        ...samplingOptions,
        system:
          "You are an AI product strategist who identifies unique, high-potential use cases for AI agents. You specialize in finding niche opportunities that are both technically feasible and commercially viable.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identify specific use cases where an AI agent could provide unique value.",
              },
            ],
          },
          {
            role: "assistant",
            content: [
              {
                type: "text",
                text: "- AI Legal Contract Reviewer: Automated analysis and risk assessment of legal documents for small businesses, - Restaurant Menu Optimizer: AI agent that analyzes sales data, costs, and customer feedback to suggest menu improvements",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Generate unique AI agent use cases that haven't been widely explored yet.",
              },
            ],
          },
        ],
      });

      for await (const delta of textStream) {
        stream.update(delta);
      }
    } catch (error) {
      logger.error("streamTextAction: failed to stream text", error);
      stream.update("I'm sorry, but I couldn't finish streaming that response.");
    } finally {
      stream.done();
    }
  })();
  return { output: stream.value };
}

const pickFirstInputValue = (
  source: Record<string, string>,
  keys: string[],
): string | undefined => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return undefined;
};

const parseSlippageInput = (raw?: string): number | null => {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.endsWith("bps")) {
    const numeric = Number.parseFloat(normalized.replace("bps", "").trim());
    if (!Number.isFinite(numeric)) return null;
    return numeric / 100;
  }

  const stripped = normalized.replace("%", "");
  const parsed = Number.parseFloat(stripped);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

export async function testAgent(agentType: string, input: Record<string, string>) {
  switch (agentType) {
    case "third-party-swap": {
      const fromToken =
        pickFirstInputValue(input, ["fromToken", "sellToken", "sourceToken", "inputToken"]) ??
        "ETH";
      const toToken =
        pickFirstInputValue(input, ["toToken", "buyToken", "targetToken", "outputToken"]) ??
        "USDC";
      const amount =
        pickFirstInputValue(input, ["amount", "amountIn", "sellAmount", "fromAmount"]) ?? "1";
      const slippageRaw = pickFirstInputValue(input, [
        "slippage",
        "slippagePercentage",
        "slippagePct",
        "slippageBps",
      ]);
      const fromChain = pickFirstInputValue(input, [
        "fromChainId",
        "fromChain",
        "chainId",
        "chain",
        "network",
      ]);
      const toChain = pickFirstInputValue(input, [
        "toChainId",
        "toChain",
        "destinationChain",
        "outputChain",
      ]);
      const fromAddress = pickFirstInputValue(input, [
        "walletAddress",
        "fromAddress",
        "address",
        "account",
        "owner",
      ]);
      const toAddress = pickFirstInputValue(input, [
        "toAddress",
        "recipientAddress",
        "destinationAddress",
      ]);
      const notes = pickFirstInputValue(input, ["notes", "context", "memo", "comment"]);
      const slippageParsed = parseSlippageInput(slippageRaw ?? undefined) ?? undefined;

      const authContext = await resolveServerUser();
      if (!authContext?.userId) {
        return JSON.stringify(
          {
            error: true,
            message: "Sign in is required before initiating custodial swaps.",
          },
          null,
          2,
        );
      }

      try {
        await ensureSwapWalletGuards({
          userId: authContext.userId,
          fromAddress,
          toAddress,
          chainHint: fromChain,
        });
      } catch (guardError) {
        return JSON.stringify(
          {
            error: true,
            message: guardError instanceof Error ? guardError.message : String(guardError),
          },
          null,
          2,
        );
      }

      try {
        const quote = await getSwapQuote({
          fromToken,
          toToken,
          amount,
          slippagePercentage: slippageParsed,
          fromChainId: fromChain,
          toChainId: toChain,
          fromAddress,
          toAddress,
          notes,
        });

        return JSON.stringify(quote, null, 2);
      } catch (error) {
        const message =
          error instanceof SwapAggregatorError
            ? error.message
            : "Failed to fetch swap quote from the aggregator.";

        return JSON.stringify(
          {
            error: true,
            provider: "Li.Fi Aggregator",
            message,
            details:
              error instanceof SwapAggregatorError ? error.details : String(error),
            input: {
              fromToken,
              toToken,
              amount,
              slippage: slippageParsed,
              fromChain,
              toChain,
              fromAddress,
              toAddress,
            },
          },
          null,
          2,
        );
      }
    }
    case "crypto-market-analyst": {
      const ticker = input.ticker?.trim() || input.symbol?.trim() || "BTC/USD";
      const focus = input.focus || input.objective || "";
      const notes = input.notes || input.context || "";

      const { snapshot, news, error } = await getPythMarketSnapshot({ ticker });

      if (!snapshot) {
        return JSON.stringify(
          {
            error: true,
            ticker,
            message: error ?? `Unable to load market data for ${ticker}`,
          },
          null,
          2,
        );
      }

      const summary = buildSnapshotSummary(snapshot, focus, notes);

      return JSON.stringify(
        {
          ticker,
          summary,
          focus,
          notes,
          snapshot,
          news,
        },
        null,
        2,
      );
    }
    default:
      return JSON.stringify(
        {
          error: true,
          message: `Agent "${agentType}" is not implemented yet.`,
        },
        null,
        2,
      );
  }
}

async function resolveServerUser() {
  const jar = await cookies();
  const bridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(bridge, { refreshSession: false });
  return context;
}
