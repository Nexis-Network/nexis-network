/**
 * Per-Model Cost Pricing
 *
 * Model pricing map, price resolution, cost calculation, and token validation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModelUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  reasoningTokens: number;
  totalCostUsd: number;
};

export type TurnUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  reasoningTokens: number;
  costUsd: number;
  durationMs: number;
  turnNumber: number;
  timestamp: string;
};

export type SessionCostSummary = {
  sessionId: string;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  totalReasoningTokens: number;
  turnCount: number;
  modelBreakdown: Record<string, ModelUsage>;
  cacheHitRate: number;
  turns: TurnUsage[];
  startedAt: string;
  updatedAt: string;
};

export type ModelPricing = {
  inputPerMtok: number;
  outputPerMtok: number;
  cacheReadPerMtok: number;
  cacheCreationPerMtok: number;
};

// ---------------------------------------------------------------------------
// Pricing (USD per million tokens)
// ---------------------------------------------------------------------------

/**
 * Pricing entries sorted by key length descending so that longer (more
 * specific) prefixes are checked first during prefix matching.
 * For example "gpt-4o-mini" is checked before "gpt-4o".
 */
const MODEL_PRICING_ENTRIES: ReadonlyArray<readonly [string, ModelPricing]> = (
  Object.entries({
    // OpenAI - GPT-4 family
    "gpt-4o-mini": { inputPerMtok: 0.15, outputPerMtok: 0.6, cacheReadPerMtok: 0.075, cacheCreationPerMtok: 0.15 },
    "gpt-4o": { inputPerMtok: 2.5, outputPerMtok: 10, cacheReadPerMtok: 1.25, cacheCreationPerMtok: 2.5 },
    "gpt-4.1-nano": { inputPerMtok: 0.1, outputPerMtok: 0.4, cacheReadPerMtok: 0.025, cacheCreationPerMtok: 0.1 },
    "gpt-4.1-mini": { inputPerMtok: 0.4, outputPerMtok: 1.6, cacheReadPerMtok: 0.1, cacheCreationPerMtok: 0.4 },
    "gpt-4.1": { inputPerMtok: 2, outputPerMtok: 8, cacheReadPerMtok: 0.5, cacheCreationPerMtok: 2 },

    // OpenAI - GPT-5 family (primary models used in this codebase)
    "gpt-5.4": { inputPerMtok: 2, outputPerMtok: 8, cacheReadPerMtok: 0.5, cacheCreationPerMtok: 2 },
    "gpt-5.3-chat": { inputPerMtok: 2, outputPerMtok: 8, cacheReadPerMtok: 0.5, cacheCreationPerMtok: 2 },
    "gpt-5-mini": { inputPerMtok: 0.4, outputPerMtok: 1.6, cacheReadPerMtok: 0.1, cacheCreationPerMtok: 0.4 },
    "gpt-5": { inputPerMtok: 2, outputPerMtok: 8, cacheReadPerMtok: 0.5, cacheCreationPerMtok: 2 },

    // OpenAI - Reasoning models
    "o3-mini": { inputPerMtok: 1.1, outputPerMtok: 4.4, cacheReadPerMtok: 0.55, cacheCreationPerMtok: 1.1 },

    // Anthropic
    "claude-opus-4-6": { inputPerMtok: 5, outputPerMtok: 25, cacheReadPerMtok: 0.5, cacheCreationPerMtok: 6.25 },
    "claude-sonnet-4-6": { inputPerMtok: 3, outputPerMtok: 15, cacheReadPerMtok: 0.3, cacheCreationPerMtok: 3.75 },
    "claude-haiku-4-5": { inputPerMtok: 1, outputPerMtok: 5, cacheReadPerMtok: 0.1, cacheCreationPerMtok: 1.25 },

    // Google
    "gemini-2.5-pro": { inputPerMtok: 1.25, outputPerMtok: 10, cacheReadPerMtok: 0.315, cacheCreationPerMtok: 4.5 },
    "gemini-2.5-flash": { inputPerMtok: 0.15, outputPerMtok: 0.6, cacheReadPerMtok: 0.0375, cacheCreationPerMtok: 1 },

    // xAI Grok (used in MODEL_MAP)
    "grok-4.1-fast-non-reasoning": { inputPerMtok: 3, outputPerMtok: 15, cacheReadPerMtok: 0.3, cacheCreationPerMtok: 3.75 },
    "grok-4.1-fast-reasoning": { inputPerMtok: 3, outputPerMtok: 15, cacheReadPerMtok: 0.3, cacheCreationPerMtok: 3.75 },
  } satisfies Record<string, ModelPricing>)
    // Sort by key length descending so longer prefixes match first
    .sort(([a], [b]) => b.length - a.length)
) as ReadonlyArray<readonly [string, ModelPricing]>;

/** Fast exact-match lookup. */
const MODEL_PRICING_MAP: ReadonlyMap<string, ModelPricing> = new Map(MODEL_PRICING_ENTRIES);

const DEFAULT_PRICING: ModelPricing = {
  inputPerMtok: 3,
  outputPerMtok: 15,
  cacheReadPerMtok: 0.3,
  cacheCreationPerMtok: 3.75,
};

/**
 * Resolves pricing for a model ID.
 *
 * Resolution order:
 * 1. Exact match against MODEL_PRICING_MAP.
 * 2. Strip gateway prefix (e.g. "openai/gpt-4o-mini" -> "gpt-4o-mini") and retry.
 * 3. Longest-prefix match against MODEL_PRICING_ENTRIES (sorted by key length
 *    descending, so "gpt-4o-mini" is checked before "gpt-4o").
 * 4. DEFAULT_PRICING fallback.
 */
export function getPricing(model: string): ModelPricing {
  // 1. Exact match
  const exact = MODEL_PRICING_MAP.get(model);
  if (exact) return exact;

  // 2. Strip gateway/provider prefix and try exact match
  const slashIdx = model.indexOf("/");
  if (slashIdx >= 0) {
    const modelName = model.slice(slashIdx + 1);
    const stripped = MODEL_PRICING_MAP.get(modelName);
    if (stripped) return stripped;

    // Also try prefix match on stripped name
    for (const [key, pricing] of MODEL_PRICING_ENTRIES) {
      if (modelName.startsWith(key)) return pricing;
    }
    return DEFAULT_PRICING;
  }

  // 3. Prefix match (handles versioned models like "gpt-4o-2024-11-20")
  // Entries are sorted by key length descending, so longer keys match first.
  for (const [key, pricing] of MODEL_PRICING_ENTRIES) {
    if (model.startsWith(key)) return pricing;
  }

  return DEFAULT_PRICING;
}

// ---------------------------------------------------------------------------
// Token validation
// ---------------------------------------------------------------------------

/** Clamps a token count to a non-negative finite integer. */
export function sanitizeTokenCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

// ---------------------------------------------------------------------------
// Cost calculation
// ---------------------------------------------------------------------------

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheCreationTokens: number,
): number {
  const safeInput = sanitizeTokenCount(inputTokens);
  const safeOutput = sanitizeTokenCount(outputTokens);
  const safeCacheRead = sanitizeTokenCount(cacheReadTokens);
  const safeCacheCreation = sanitizeTokenCount(cacheCreationTokens);

  const pricing = getPricing(model);

  // Compute each component separately to minimize floating-point accumulation.
  const inputCost = (safeInput / 1_000_000) * pricing.inputPerMtok;
  const outputCost = (safeOutput / 1_000_000) * pricing.outputPerMtok;
  const cacheReadCost = (safeCacheRead / 1_000_000) * pricing.cacheReadPerMtok;
  const cacheCreationCost = (safeCacheCreation / 1_000_000) * pricing.cacheCreationPerMtok;

  return inputCost + outputCost + cacheReadCost + cacheCreationCost;
}
