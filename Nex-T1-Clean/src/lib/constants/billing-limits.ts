/**
 * Billing Limits & Token Budget Configuration
 *
 * Dual-gate system:
 * 1. Credits — total usage volume per billing period
 * 2. Token limits — per-request token budgets per model + tier
 *
 * Base credit floors:
 * - Weighted billing settles against actual token/tool usage
 * - These values are the minimum reservation per request before token settlement
 */

// ============================================================================
// Credit Limits (per billing period)
// ============================================================================

export const USAGE_CREDIT_LIMITS: Record<string, number> = {
  free: 30,
  pro: 600,
  trader: 1800,
  ultra: 5000,
  enterprise: 15000,
};

export function resolveUsageCreditLimit(plan: string | null | undefined): number {
  if (!plan) return USAGE_CREDIT_LIMITS.free;
  return USAGE_CREDIT_LIMITS[plan] ?? USAGE_CREDIT_LIMITS.free;
}

// ============================================================================
// Per-Request Token Limits (input + output combined)
// ============================================================================

/**
 * Maximum tokens per request, by model key and subscription tier.
 * These are soft caps enforced before sending to the AI gateway.
 * Format: { [modelKey]: { [tier]: maxTokens } }
 */
export const TOKEN_LIMITS_PER_REQUEST: Record<string, Record<string, number>> = {
  "nex-t1-free": {
    free: 4000,
    pro: 6000,
    trader: 8000,
    ultra: 8000,
    enterprise: 8000,
  },
  "nex-t1-pro": {
    pro: 32000,
    trader: 64000,
    ultra: 128000,
    enterprise: 300000,
  },
  "nex-t1-ultra": {
    ultra: 128000,
    enterprise: 300000,
  },
  "nex-build": {
    pro: 32000,
    trader: 64000,
    ultra: 128000,
    enterprise: 300000,
  },
  "nex-degen": {
    pro: 32000,
    trader: 64000,
    ultra: 128000,
    enterprise: 300000,
  },
};

/**
 * Resolve the token limit for a given model key and subscription tier.
 * Returns null if the model is not available for the given tier.
 */
export function resolveTokenLimit(
  modelKey: string,
  tier: string | null | undefined,
): number | null {
  const safeTier = tier ?? "free";
  const modelLimits = TOKEN_LIMITS_PER_REQUEST[modelKey];
  if (!modelLimits) return null;
  return modelLimits[safeTier] ?? null;
}

// ============================================================================
// Credit Cost per Model
// ============================================================================

/**
 * How many credits a single request costs, by model key.
 * Higher-capability models cost more credits per request.
 */
export const CREDIT_COST_PER_REQUEST: Record<string, number> = {
  "nex-t1-free": 1,
  "nex-t1-pro": 2,
  "nex-t1-ultra": 4,
  "nex-build": 3,
  "nex-degen": 2,
};

export function resolveCreditCost(modelKey: string): number {
  return CREDIT_COST_PER_REQUEST[modelKey] ?? 1;
}

// ============================================================================
// Tool Budget per Tier
// ============================================================================

/**
 * Maximum tool invocations per user message, by subscription tier.
 * Prevents excessive tool usage on lower tiers.
 */
export const TOOL_BUDGET_PER_TIER: Record<string, { maxInvocations: number; maxConcurrent: number }> = {
  free: { maxInvocations: 3, maxConcurrent: 1 },
  pro: { maxInvocations: 10, maxConcurrent: 3 },
  trader: { maxInvocations: 15, maxConcurrent: 5 },
  ultra: { maxInvocations: 25, maxConcurrent: 8 },
  enterprise: { maxInvocations: 50, maxConcurrent: 10 },
};

export function resolveToolBudget(
  tier: string | null | undefined,
): { maxInvocations: number; maxConcurrent: number } {
  const safeTier = tier ?? "free";
  return TOOL_BUDGET_PER_TIER[safeTier] ?? TOOL_BUDGET_PER_TIER.free;
}

// ============================================================================
// Rate Limits per Tier (requests per window)
// ============================================================================

/**
 * Chat request rate limits by subscription tier.
 * windowMs = sliding window in milliseconds
 * maxRequests = max requests within that window
 */
export const CHAT_RATE_LIMITS: Record<string, { windowMs: number; maxRequests: number }> = {
  free: { windowMs: 5 * 60 * 1000, maxRequests: 10 },
  pro: { windowMs: 5 * 60 * 1000, maxRequests: 30 },
  trader: { windowMs: 5 * 60 * 1000, maxRequests: 50 },
  ultra: { windowMs: 5 * 60 * 1000, maxRequests: 100 },
  enterprise: { windowMs: 5 * 60 * 1000, maxRequests: 200 },
};

export function resolveChatRateLimit(
  tier: string | null | undefined,
): { windowMs: number; maxRequests: number } {
  const safeTier = tier ?? "free";
  return CHAT_RATE_LIMITS[safeTier] ?? CHAT_RATE_LIMITS.free;
}
