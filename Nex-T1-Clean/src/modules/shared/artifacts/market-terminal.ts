import { artifact } from "@/lib/ai/artifact-kit";
import { z } from "zod";

const MarketTerminalUniverseSchema = z.literal("crypto");
const MarketTerminalInitialViewSchema = z.enum([
  "screener",
  "pivot",
  "trade-tape",
  "review",
]);

const MarketTerminalActionSchema = z.object({
  canAnalyze: z.boolean().default(true),
  canWatchlist: z.boolean().default(true),
  canSwap: z.boolean().default(true),
  swapMode: z.literal("agent_handoff_hitl").default("agent_handoff_hitl"),
});

const MarketTerminalSortSchema = z.object({
  columnId: z.string().min(1),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

const MarketTerminalFilterSchema = z.object({
  columnId: z.string().min(1),
  operator: z.string().min(1),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string(), z.number()])),
  ]),
});

const MarketTerminalPivotAxisSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
});

const MarketTerminalPivotMeasureSchema = z.object({
  id: z.string().min(1),
  aggregator: z.string().min(1).default("sum"),
});

const MarketTerminalPivotModelSchema = z.object({
  rows: z.array(MarketTerminalPivotAxisSchema).default([]),
  columns: z.array(MarketTerminalPivotAxisSchema).default([]),
  measures: z.array(MarketTerminalPivotMeasureSchema).default([]),
});

const MarketTerminalSwapTargetSchema = z.object({
  assetId: z.string().min(1),
  symbol: z.string().min(1),
  chain: z.string().min(1),
});

export const MarketTerminalScreenerRowSchema = z.object({
  assetId: z.string().min(1),
  symbol: z.string().min(1),
  name: z.string().min(1),
  chain: z.string().min(1),
  price: z.number().nullable().default(null),
  change24hPct: z.number().nullable().default(null),
  marketCap: z.number().nullable().default(null),
  volume24h: z.number().nullable().default(null),
  liquidityScore: z.number().nullable().default(null),
  auditScore: z.number().nullable().default(null),
  narrative: z.string().nullable().default(null),
  socialDominance: z.number().nullable().default(null),
  sparkline: z.array(z.number()).default([]),
  imageUrl: z.string().nullable().default(null),
  swapTarget: MarketTerminalSwapTargetSchema.nullable().default(null),
});

export const MarketTerminalTradeRowSchema = z.object({
  id: z.string().min(1),
  poolKey: z.string().min(1),
  network: z.string().min(1),
  poolAddress: z.string().min(1),
  txHash: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  tokenAmount: z.string().min(1),
  quoteAmount: z.string().min(1),
  volumeUsd: z.number(),
  priceNative: z.number(),
  priceUsd: z.number(),
  timestamp: z.number().int().nonnegative(),
});

export const MarketTerminalScreenerResponseSchema = z.object({
  rows: z.array(MarketTerminalScreenerRowSchema),
  metadata: z.object({
    universe: MarketTerminalUniverseSchema,
    rowCount: z.number().int().nonnegative(),
    generatedAt: z.string().datetime(),
    coinIds: z.array(z.string()).default([]),
  }),
  recommendedPivotFields: z.array(z.string()).default([]),
  recommendedMeasureFields: z.array(z.string()).default([]),
});

export const MarketTerminalTradeHistoryResponseSchema = z.object({
  rows: z.array(MarketTerminalTradeRowSchema),
  metadata: z.object({
    pools: z.array(z.string()).default([]),
    rowCount: z.number().int().nonnegative(),
    generatedAt: z.string().datetime(),
  }),
});

const MarketTerminalArtifactSchemaInternal = z.object({
  title: z.string().min(1).default("Market Terminal"),
  universe: MarketTerminalUniverseSchema.default("crypto"),
  initialView: MarketTerminalInitialViewSchema.default("screener"),
  query: z.string().default(""),
  chain: z.string().default("all"),
  quoteCurrency: z.string().default("usd"),
  selectedAssetIds: z.array(z.string()).default([]),
  selectedPools: z.array(z.string()).default([]),
  visibleColumns: z.array(z.string()).default([]),
  sortModel: z.array(MarketTerminalSortSchema).default([]),
  filterModel: z.array(MarketTerminalFilterSchema).default([]),
  pivotModel: MarketTerminalPivotModelSchema.default({
    rows: [],
    columns: [],
    measures: [],
  }),
  actions: MarketTerminalActionSchema.default({
    canAnalyze: true,
    canWatchlist: true,
    canSwap: true,
    swapMode: "agent_handoff_hitl",
  }),
  generatedBy: z.string().default("agent"),
});

export const MarketTerminalArtifactSchema =
  MarketTerminalArtifactSchemaInternal;

export type MarketTerminalArtifactPayload = z.infer<
  typeof MarketTerminalArtifactSchema
>;
export type MarketTerminalScreenerRow = z.infer<
  typeof MarketTerminalScreenerRowSchema
>;
export type MarketTerminalTradeRow = z.infer<
  typeof MarketTerminalTradeRowSchema
>;
export type MarketTerminalScreenerResponse = z.infer<
  typeof MarketTerminalScreenerResponseSchema
>;
export type MarketTerminalTradeHistoryResponse = z.infer<
  typeof MarketTerminalTradeHistoryResponseSchema
>;

export function createMarketTerminalArtifactPayload(
  payload: Partial<MarketTerminalArtifactPayload> = {},
): MarketTerminalArtifactPayload {
  return MarketTerminalArtifactSchema.parse(payload);
}

export const MarketTerminalArtifact = artifact<MarketTerminalArtifactPayload>(
  "market-terminal",
  MarketTerminalArtifactSchema,
);
