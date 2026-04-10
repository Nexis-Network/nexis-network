import { artifact } from "@/lib/ai/artifact-kit";
import { z } from "zod";

import {
  ArtifactMetadataSchema,
  StreamStateSchema,
  createArtifactEnvelope,
  type ArtifactEnvelope,
} from "./base";

const PumpFunTradeActionSchema = z.object({
  command: z.enum(["create_and_buy", "buy", "sell"]),
  success: z.boolean(),
  signature: z.string().optional(),
  mint: z.string(),
  description: z.string().optional(),
  cluster: z.enum(["mainnet-beta", "devnet"]),
  slippageBasisPoints: z.number().optional(),
  priorityFees: z
    .object({
      unitLimit: z.number().optional(),
      unitPrice: z.number().optional(),
    })
    .optional(),
  error: z.string().optional(),
  explorerUrl: z.string().url().optional(),
});

const PumpFunCoinMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  change: z.number().optional(),
  changeLabel: z.string().optional(),
  unit: z.string().optional(),
});

const PumpFunCoinOverviewSchema = z.object({
  mint: z.string(),
  name: z.string(),
  symbol: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  website: z.string().optional(),
  twitter: z.string().optional(),
  telegram: z.string().optional(),
  metrics: z.array(PumpFunCoinMetricSchema).default([]),
  holders: z.number().int().nonnegative().optional(),
  marketCapUsd: z.number().optional(),
  bondingCurve: z.record(z.string(), z.unknown()).optional(),
});

const PumpFunChatMessageSchema = z.object({
  id: z.string(),
  author: z.string(),
  message: z.string(),
  timestamp: z.string(),
  avatar: z.string().optional(),
  highlighted: z.boolean().optional(),
});

const PumpFunTrendInsightSchema = z.object({
  title: z.string(),
  description: z.string(),
  score: z.number().min(0).max(1).optional(),
  timeframe: z.string().optional(),
});

export const PumpFunArtifactDataSchema = z.discriminatedUnion("view", [
  z.object({
    view: z.literal("trade"),
    headline: z.string().optional(),
    action: PumpFunTradeActionSchema,
  }),
  z.object({
    view: z.literal("coin_analysis"),
    headline: z.string().optional(),
    overview: PumpFunCoinOverviewSchema,
    relatedTokens: z
      .array(
        z.object({
          mint: z.string(),
          name: z.string(),
          symbol: z.string(),
          reason: z.string().optional(),
        }),
      )
      .default([]),
  }),
  z.object({
    view: z.literal("chat_digest"),
    headline: z.string().optional(),
    tokenMint: z.string(),
    room: z.string().optional(),
    stats: z
      .object({
        messageCount: z.number().int().nonnegative().optional(),
        uniqueUsers: z.number().int().nonnegative().optional(),
        sentimentScore: z.number().min(-1).max(1).optional(),
        trendingKeywords: z.array(z.string()).default([]),
      })
      .default({ trendingKeywords: [] }),
    messages: z.array(PumpFunChatMessageSchema).default([]),
  }),
  z.object({
    view: z.literal("trend_report"),
    headline: z.string().optional(),
    generatedAt: z.string().datetime(),
    summary: z.string().optional(),
    featuredCoins: z
      .array(
        z.object({
          mint: z.string(),
          name: z.string(),
          symbol: z.string(),
          score: z.number().optional(),
          change24h: z.number().optional(),
        }),
      )
      .default([]),
    insights: z.array(PumpFunTrendInsightSchema).default([]),
  }),
]);

export type PumpFunArtifactData = z.infer<typeof PumpFunArtifactDataSchema>;

export const PumpFunArtifact = artifact<PumpFunArtifactData>(
  "pumpfun",
  PumpFunArtifactDataSchema,
);

export function createPumpFunArtifact(
  data: PumpFunArtifactData,
  overrides: Partial<ArtifactEnvelope<"pumpfun", PumpFunArtifactData>> = {},
) {
  return createArtifactEnvelope("pumpfun", data, {
    ...overrides,
    metadata: overrides.metadata
      ? ArtifactMetadataSchema.parse(overrides.metadata)
      : undefined,
    streamState: overrides.streamState
      ? StreamStateSchema.parse(overrides.streamState)
      : undefined,
  });
}
