import type { IntentCategory } from "@/modules/chat/intent-classifier";

type FlexCostTier = "nano" | "mini" | "standard" | "premium";

// Intent categories eligible for Flex Processing
export const FLEX_ELIGIBLE_INTENTS: ReadonlySet<IntentCategory> = new Set([
  "research",
  "analysis",
  "complex_task",
  "smart_contract",
]);

// Intent categories that MUST use real-time processing
export const REALTIME_REQUIRED_INTENTS: ReadonlySet<IntentCategory> = new Set([
  "greeting",
  "price_check",
  "balance_check",
  "wallet_create",
  "wallet_action",
  "trending",
  "degen_trading",
]);

// Environment configuration for flex processing
export const FLEX_ENV = {
  FLEX_ENABLED: (process.env.NEX_FLEX_PROCESSING_ENABLED ?? "true").toLowerCase() === "true",
  FLEX_DEFAULT_FOR_ASYNC: (process.env.NEX_FLEX_DEFAULT_FOR_ASYNC ?? "true").toLowerCase() === "true",
  FORCE_FLEX_MODE: (process.env.NEX_FORCE_FLEX_MODE ?? "").toLowerCase() === "true",
  FORCE_REALTIME_MODE: (process.env.NEX_FORCE_REALTIME_MODE ?? "").toLowerCase() === "true",
} as const;

// Cost tier to model mapping
export const COST_TIER_MODELS: Record<FlexCostTier, { primary: string; fallbacks: string[] }> = {
  nano: {
    primary: "gpt-5-nano",
    fallbacks: ["gpt-5-mini"],
  },
  mini: {
    primary: "gpt-5-mini",
    fallbacks: ["gpt-5-nano"],
  },
  standard: {
    primary: "gpt-5.4",
    fallbacks: ["gpt-5-mini", "gpt-5-nano"],
  },
  premium: {
    primary: "gpt-5.4",
    fallbacks: ["gpt-5-mini", "gpt-5-nano"],
  },
};

// Intent category to cost tier mapping
export const INTENT_COST_TIER_MAP: Record<IntentCategory, FlexCostTier> = {
  greeting: "nano",
  price_check: "nano",
  trending: "nano",
  balance_check: "mini",
  wallet_create: "mini",
  wallet_action: "mini",
  market_data: "mini",
  conversation: "mini",
  general_question: "standard",
  degen_trading: "standard",
  research: "premium",
  analysis: "premium",
  complex_task: "premium",
  smart_contract: "premium",
  nft: "mini",
  image_generation: "standard",
  trading: "standard",
  defi: "premium",
  defi_swap: "standard",
  defi_yield: "premium",
  defi_liquidity: "premium",
  general: "mini",
  task_scheduling: "standard",
  code_generation: "premium",
  document_analysis: "premium",
};

// Cost factor multipliers for each tier
export const COST_TIER_FACTORS: Record<FlexCostTier, number> = {
  nano: 0.1,
  mini: 0.25,
  standard: 0.5,
  premium: 1.0,
};

// Approximate pricing (USD per 1M tokens)
export const FLEX_MODEL_PRICING: Record<
  string,
  {
    input: number;
    output: number;
    longContextThreshold?: number;
    longContextInput?: number;
    longContextOutput?: number;
  }
> = {
  "gpt-5-nano": { input: 0.15, output: 0.60 },
  "gpt-5-mini": { input: 0.30, output: 1.20 },
  // AI Gateway catalog prices verified on 2026-03-05
  "gpt-5.4": {
    input: 2.50,
    output: 15.00,
    longContextThreshold: 272_000,
    longContextInput: 5.00,
    longContextOutput: 22.50,
  },
};
