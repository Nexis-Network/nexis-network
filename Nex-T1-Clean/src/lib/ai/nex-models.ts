/**
 * Central Nex model catalog mapped to Vercel AI Gateway model IDs.
 * Use these aliases across UI, analytics, and the pipeline to avoid
 * scattered literal model strings.
 *
 * Each model includes:
 * - Gateway routing info (model ID, provider)
 * - Tier access control (which subscription tiers can use it)
 * - Token/cost metadata (maxTokens, creditCost, supportsTokenCounting)
 * - Safety metadata (requiresHITL, supportsAdaptiveThinking)
 */

export type NexModelKey =
  | "nex-t1-free"
  | "nex-t1-pro"
  | "nex-t1-ultra"
  | "nex-build"
  | "nex-degen";

export type NexModelKind = "fast" | "reasoning" | "builder" | "degen";

export type NexModelTier = "free" | "pro" | "trader" | "ultra" | "enterprise";

export type NexModelProvider = "zai" | "openai" | "anthropic" | "alibaba";

export interface NexModelConfig {
  key: NexModelKey;
  label: string;
  description: string;
  model: string; // AI Gateway model id
  provider: NexModelProvider;
  badges?: string[];
  kind: NexModelKind;
  tiers: NexModelTier[];
  /**
   * Legacy app-facing token budget field.
   * In the chat UI this is used as the total available context budget, not the
   * model's max output token cap.
   */
  maxTokens: number;
  /** Total context window supported by the underlying model. */
  contextWindow: number;
  /** Maximum output tokens supported by the underlying model. */
  maxOutputTokens: number;
  /** Credits consumed per request for this model */
  creditCost: number;
  /** Whether the provider supports the token counting API */
  supportsTokenCounting: boolean;
  /** Whether the model supports adaptive/extended thinking */
  supportsAdaptiveThinking: boolean;
  /** Whether to use structured outputs (JSON mode) when available */
  supportsStructuredOutput: boolean;
}

export const GPT_5_4_CONTEXT_WINDOW = 1_050_000;
export const GPT_5_4_MAX_OUTPUT_TOKENS = 128_000;

export const NEX_MODELS: Record<NexModelKey, NexModelConfig> = {
  "nex-t1-free": {
    key: "nex-t1-free",
    label: "Nex Instant",
    description: "Fast everyday chat",
    model: "openai/gpt-5.4",
    provider: "openai",
    kind: "fast",
    tiers: ["free", "pro", "trader", "ultra", "enterprise"],
    maxTokens: GPT_5_4_CONTEXT_WINDOW,
    contextWindow: GPT_5_4_CONTEXT_WINDOW,
    maxOutputTokens: GPT_5_4_MAX_OUTPUT_TOKENS,
    creditCost: 1,
    supportsTokenCounting: true,
    supportsAdaptiveThinking: true,
    supportsStructuredOutput: true,
  },
  "nex-t1-pro": {
    key: "nex-t1-pro",
    label: "Nex Copilot",
    description: "Advanced reasoning and execution",
    model: "openai/gpt-5.4",
    provider: "openai",
    kind: "reasoning",
    tiers: ["pro", "trader", "ultra", "enterprise"],
    maxTokens: GPT_5_4_CONTEXT_WINDOW,
    contextWindow: GPT_5_4_CONTEXT_WINDOW,
    maxOutputTokens: GPT_5_4_MAX_OUTPUT_TOKENS,
    creditCost: 5,
    supportsTokenCounting: true,
    supportsAdaptiveThinking: true,
    supportsStructuredOutput: true,
  },
  "nex-t1-ultra": {
    key: "nex-t1-ultra",
    label: "Nex Ultra",
    description: "Maximum capability for complex workflows",
    model: "openai/gpt-5.4",
    provider: "openai",
    badges: ["MAX"],
    kind: "reasoning",
    tiers: ["ultra", "enterprise"],
    maxTokens: GPT_5_4_CONTEXT_WINDOW,
    contextWindow: GPT_5_4_CONTEXT_WINDOW,
    maxOutputTokens: GPT_5_4_MAX_OUTPUT_TOKENS,
    creditCost: 10,
    supportsTokenCounting: true,
    supportsAdaptiveThinking: true,
    supportsStructuredOutput: true,
  },
  "nex-build": {
    key: "nex-build",
    label: "Nex Code",
    description: "Code-first generation and artifacts",
    model: "openai/gpt-5.4",
    provider: "openai",
    kind: "builder",
    tiers: ["pro", "trader", "ultra", "enterprise"],
    maxTokens: GPT_5_4_CONTEXT_WINDOW,
    contextWindow: GPT_5_4_CONTEXT_WINDOW,
    maxOutputTokens: GPT_5_4_MAX_OUTPUT_TOKENS,
    creditCost: 5,
    supportsTokenCounting: true,
    supportsAdaptiveThinking: true,
    supportsStructuredOutput: true,
  },
  "nex-degen": {
    key: "nex-degen",
    label: "Nex Degen",
    description: "High-risk market mode",
    model: "openai/gpt-5.4",
    provider: "openai",
    badges: ["DEGEN"],
    kind: "degen",
    tiers: ["pro", "trader", "ultra", "enterprise"],
    maxTokens: GPT_5_4_CONTEXT_WINDOW,
    contextWindow: GPT_5_4_CONTEXT_WINDOW,
    maxOutputTokens: GPT_5_4_MAX_OUTPUT_TOKENS,
    creditCost: 3,
    supportsTokenCounting: true,
    supportsAdaptiveThinking: true,
    supportsStructuredOutput: true,
  },
};

export const NEX_MODEL_LIST = Object.values(NEX_MODELS);

/** Legacy aliases and historic model IDs that map to current model keys. */
const MODEL_VALUE_ALIASES: Record<string, NexModelKey> = {
  "nex-code": "nex-build",
  "nex-t1-max": "nex-t1-ultra",
  "gpt-5.3-chat": "nex-t1-free",
  "openai/gpt-5.3-chat": "nex-t1-free",
  "gpt-5.4": "nex-t1-pro",
};

/**
 * Canonical product-key preference when multiple tiers share one model ID.
 * This keeps legacy model-id based lookups deterministic and avoids billing
 * underestimation if callers pass only provider IDs.
 */
const MODEL_ID_CANONICAL_KEY: Partial<Record<string, NexModelKey>> = {
  "openai/gpt-5.4": "nex-t1-pro",
};

const MODEL_ID_TO_KEY: Record<string, NexModelKey> = NEX_MODEL_LIST.reduce(
  (acc, model) => {
    // Preserve first-seen mapping to keep deterministic resolution when multiple
    // product aliases intentionally share the same underlying model ID.
    if (!(model.model in acc)) {
      acc[model.model] = model.key;
    }
    return acc;
  },
  {} as Record<string, NexModelKey>,
);

for (const [modelId, key] of Object.entries(MODEL_ID_CANONICAL_KEY)) {
  if (key) {
    MODEL_ID_TO_KEY[modelId] = key;
  }
}

/**
 * Resolve a user-facing model value to the canonical Nex model key.
 * Accepts:
 * - model keys (e.g. "nex-t1-pro")
 * - legacy aliases (e.g. "nex-t1-max")
 * - gateway model IDs (e.g. "openai/gpt-5.4")
 */
export function resolveModelKey(
  value: string | null | undefined,
): NexModelKey | undefined {
  if (!value) return undefined;
  const normalized = MODEL_VALUE_ALIASES[value] ?? value;
  if (normalized in NEX_MODELS) return normalized as NexModelKey;
  return MODEL_ID_TO_KEY[value];
}

/**
 * Resolve a NexModelConfig by its key (or legacy alias). Returns undefined if not found.
 */
export function resolveModel(key: string): NexModelConfig | undefined {
  const resolvedKey = resolveModelKey(key);
  if (!resolvedKey) return undefined;
  return NEX_MODELS[resolvedKey];
}

/**
 * Resolve a human-readable model label for UI rendering.
 */
export function resolveModelLabel(
  value: string | null | undefined,
  fallback = "Nex Instant",
): string {
  const key = resolveModelKey(value);
  if (!key) return fallback;
  return NEX_MODELS[key].label;
}

/**
 * Check if a model key is available for a given subscription tier.
 */
export function isModelAvailableForTier(
  key: NexModelKey,
  tier: NexModelTier,
): boolean {
  const model = NEX_MODELS[key];
  if (!model) return false;
  return model.tiers.includes(tier);
}

/**
 * Get all models available for a given tier.
 */
export function getModelsForTier(tier: NexModelTier): NexModelConfig[] {
  return NEX_MODEL_LIST.filter((m) => m.tiers.includes(tier));
}

/**
 * High-cost model set for credit enforcement.
 * Models in this set consume more credits per request.
 */
export const HIGH_COST_MODEL_IDS = new Set(
  NEX_MODEL_LIST.filter((m) => m.creditCost >= 5).map((m) => m.model),
);
