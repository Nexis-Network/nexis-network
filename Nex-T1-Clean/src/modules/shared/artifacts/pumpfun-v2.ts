import { artifact } from "@/lib/ai/artifact-kit";
import { z } from "zod";

const PumpFunV2ClusterSchema = z.enum(["mainnet-beta", "devnet"]);
const PumpFunV2UniverseSchema = z.enum(["new", "bonding", "graduated"]);

const PumpFunV2TokenSchema = z.object({
  mint: z.string().min(1),
  name: z.string().min(1),
  symbol: z.string().min(1),
  logoUrl: z.string().url().nullable().optional(),
  priceUsd: z.number().nullable().optional(),
  marketCapUsd: z.number().nullable().optional(),
  liquidityUsd: z.number().nullable().optional(),
  volume24hUsd: z.number().nullable().optional(),
  migrationProgressPct: z.number().min(0).max(100).nullable().optional(),
  pairAddress: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  twitter: z.string().nullable().optional(),
  telegram: z.string().nullable().optional(),
});

const PumpFunV2ScoreSchema = z.object({
  opportunityScore: z.number().min(0).max(100),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  reasons: z.array(z.string()).default([]),
});

const PumpFunV2TransactionSchema = z.object({
  signature: z.string().optional(),
  side: z.enum(["buy", "sell"]),
  timestamp: z.string(),
  valueUsd: z.number().nullable().optional(),
  solAmount: z.number().nullable().optional(),
  tokenAmount: z.number().nullable().optional(),
  walletAddress: z.string().nullable().optional(),
});

const PumpFunV2WalletSchema = z.object({
  source: z.literal("cdp_embedded_solana"),
  address: z.string().nullable(),
  connected: z.boolean(),
});

const PumpFunV2ChartSchema = z.object({
  chainId: z.literal("solana").default("solana"),
  tokenAddress: z.string().nullable().optional(),
  pairAddress: z.string().nullable().optional(),
  defaultInterval: z.string().default("1H"),
});

const PumpFunV2ActionStateSchema = z.enum([
  "idle",
  "preparing",
  "awaiting_signature",
  "submitted",
  "error",
]);

const PumpFunV2ActionsSchema = z.object({
  canBuy: z.boolean().default(true),
  canSell: z.boolean().default(false),
  defaultBuyAmountSol: z.number().positive().default(0.05),
  defaultSellPercent: z.number().min(1).max(100).default(25),
  slippageBps: z.number().int().min(1).max(5000).default(500),
  buyState: PumpFunV2ActionStateSchema.default("idle"),
  sellState: PumpFunV2ActionStateSchema.default("idle"),
  lastSignature: z.string().optional(),
  lastError: z.string().optional(),
});

const PumpFunV2OpportunityItemSchema = z.object({
  token: PumpFunV2TokenSchema,
  score: PumpFunV2ScoreSchema,
});

export const PumpFunV2ArtifactDataSchema = z.discriminatedUnion("view", [
  z.object({
    view: z.literal("opportunity-list"),
    generatedAt: z.string().datetime(),
    cluster: PumpFunV2ClusterSchema,
    universe: PumpFunV2UniverseSchema,
    items: z.array(PumpFunV2OpportunityItemSchema).default([]),
    wallet: PumpFunV2WalletSchema,
  }),
  z.object({
    view: z.literal("token-dashboard"),
    generatedAt: z.string().datetime(),
    cluster: PumpFunV2ClusterSchema,
    token: PumpFunV2TokenSchema,
    score: PumpFunV2ScoreSchema.optional(),
    transactions: z.array(PumpFunV2TransactionSchema).default([]),
    chart: PumpFunV2ChartSchema,
    wallet: PumpFunV2WalletSchema,
    actions: PumpFunV2ActionsSchema,
  }),
  z.object({
    view: z.literal("trade-result"),
    generatedAt: z.string().datetime(),
    cluster: PumpFunV2ClusterSchema,
    token: PumpFunV2TokenSchema,
    score: PumpFunV2ScoreSchema.optional(),
    transactions: z.array(PumpFunV2TransactionSchema).default([]),
    chart: PumpFunV2ChartSchema,
    wallet: PumpFunV2WalletSchema,
    actions: PumpFunV2ActionsSchema,
    result: z.object({
      side: z.enum(["buy", "sell"]),
      status: z.enum(["submitted", "error"]),
      signature: z.string().optional(),
      error: z.string().optional(),
    }),
  }),
]);

export type PumpFunV2ArtifactData = z.infer<typeof PumpFunV2ArtifactDataSchema>;

export const PumpFunV2Artifact = artifact<PumpFunV2ArtifactData>(
  "pumpfun-v2",
  PumpFunV2ArtifactDataSchema,
);
