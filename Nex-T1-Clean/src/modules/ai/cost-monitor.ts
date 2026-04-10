/**
 * Cost Monitoring and Token Usage Tracking
 * 
 * Domain: AI
 * Responsibility: Tracks token usage, calculates costs, attributes by category
 * Depends on: intent-classifier, model-router, flex-router
 * Notes: Enables cost optimization through usage analytics.
 *        Tracks costs by intent category, user, model, and service tier.
 *        Reference: https://platform.openai.com/docs/guides/cost-optimization
 */

import type { IntentCategory } from "@/modules/chat/intent-classifier";
import type { ServiceTier, CostTier } from "@/server/services/ai-sdk/flex-router";
import type { ModelTier } from "@/modules/ai/model-router";


import { logger } from '@/lib/logger';
/**
 * Token usage for a single request
 */
export type TokenUsage = {
  /** Input/prompt tokens */
  inputTokens: number;
  /** Output/completion tokens */
  outputTokens: number;
  /** Reasoning tokens (for reasoning models) */
  reasoningTokens?: number;
  /** Cached input tokens (for prompt caching) */
  cachedInputTokens?: number;
  /** Total tokens */
  totalTokens: number;
};

/**
 * Cost calculation for a request
 */
export type CostCalculation = {
  /** Input token cost in USD */
  inputCost: number;
  /** Output token cost in USD */
  outputCost: number;
  /** Reasoning token cost in USD */
  reasoningCost: number;
  /** Total cost in USD */
  totalCost: number;
  /** Savings from prompt caching */
  cachingSavings: number;
  /** Savings from flex processing */
  flexSavings: number;
  /** Savings from model selection */
  modelSavings: number;
  /** Total savings */
  totalSavings: number;
  /** Cost without optimizations */
  baselineCost: number;
  /** Effective cost reduction percentage */
  reductionPercentage: number;
};

/**
 * Usage event for tracking
 */
export type UsageEvent = {
  /** Unique event ID */
  id: string;
  /** Timestamp */
  timestamp: Date;
  /** User ID (optional) */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Intent category */
  intentCategory: IntentCategory;
  /** Model used */
  modelId: string;
  /** Model tier */
  modelTier: ModelTier;
  /** Service tier */
  serviceTier: ServiceTier;
  /** Cost tier */
  costTier: CostTier;
  /** Token usage */
  usage: TokenUsage;
  /** Cost calculation */
  cost: CostCalculation;
  /** Response latency in ms */
  latencyMs: number;
  /** Whether request succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
};

/**
 * Aggregated usage statistics
 */
export type UsageStats = {
  /** Time period start */
  periodStart: Date;
  /** Time period end */
  periodEnd: Date;
  /** Total requests */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Total tokens used */
  totalTokens: number;
  /** Total input tokens */
  totalInputTokens: number;
  /** Total output tokens */
  totalOutputTokens: number;
  /** Total cost in USD */
  totalCost: number;
  /** Total savings in USD */
  totalSavings: number;
  /** Cost reduction percentage */
  averageReduction: number;
  /** Average latency in ms */
  averageLatencyMs: number;
  /** Usage by intent category */
  byIntent: Record<IntentCategory, {
    requests: number;
    tokens: number;
    cost: number;
  }>;
  /** Usage by model */
  byModel: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
  }>;
  /** Usage by service tier */
  byServiceTier: Record<ServiceTier, {
    requests: number;
    tokens: number;
    cost: number;
    savings: number;
  }>;
};

/**
 * Model pricing per 1M tokens (approximate, USD)
 */
type ModelPricing = {
  input: number;
  output: number;
  reasoning?: number;
  cacheRead?: number;
  longContextThreshold?: number;
  longContextInput?: number;
  longContextOutput?: number;
  longContextReasoning?: number;
  longContextCacheRead?: number;
};

const MODEL_PRICING: Record<string, ModelPricing> = {
  // Nano tier
  "gpt-5-nano": { input: 0.15, output: 0.60 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  
  // Mini tier
  "gpt-5-mini": { input: 0.30, output: 1.20 },
  
  // Standard tier
  "gpt-5": { input: 2.50, output: 10.00, reasoning: 10.00 },
  "gpt-4o": { input: 2.50, output: 10.00 },
  
  // Premium tier
  "gpt-5.4": {
    input: 2.50,
    output: 15.00,
    reasoning: 15.00,
    cacheRead: 0.25,
    longContextThreshold: 272_000,
    longContextInput: 5.00,
    longContextOutput: 22.50,
    longContextReasoning: 22.50,
    longContextCacheRead: 0.50,
  },
  
  // AI Gateway catalog prices (USD per 1M tokens, updated 2026-03-05)
  "gpt-5.4-pro": { input: 15.00, output: 120.00, reasoning: 120.00 },
};

// Baseline model for savings calculation
const BASELINE_MODEL = "gpt-5-mini";

// Flex processing discount
const FLEX_DISCOUNT = 0.5; // 50% off

// Prompt caching discount for cached tokens
const CACHE_DISCOUNT = 0.75; // 75% off

// In-memory usage buffer (would be persisted in production)
const usageBuffer: UsageEvent[] = [];
const MAX_BUFFER_SIZE = 10000;

/**
 * Normalizes model ID to match pricing keys
 */
function normalizeModelId(modelId: string): string {
  // Strip provider prefix
  const normalized = modelId.includes("/") 
    ? modelId.split("/").pop() ?? modelId 
    : modelId;
  
  return normalized;
}

/**
 * Gets pricing for a model
 */
function getModelPricing(
  modelId: string,
  usage?: Pick<TokenUsage, "inputTokens">,
): {
  input: number;
  output: number;
  reasoning: number;
  cacheRead: number;
} {
  const normalized = normalizeModelId(modelId);
  const pricing = MODEL_PRICING[normalized] ?? MODEL_PRICING[BASELINE_MODEL];
  const useLongContext =
    typeof pricing.longContextThreshold === "number" &&
    (usage?.inputTokens ?? 0) > pricing.longContextThreshold;
  const defaultCacheRead = pricing.input * (1 - CACHE_DISCOUNT);

  return {
    input: useLongContext ? pricing.longContextInput ?? pricing.input : pricing.input,
    output: useLongContext ? pricing.longContextOutput ?? pricing.output : pricing.output,
    reasoning: useLongContext
      ? pricing.longContextReasoning ?? pricing.reasoning ?? pricing.output
      : pricing.reasoning ?? pricing.output,
    cacheRead: useLongContext
      ? pricing.longContextCacheRead ?? pricing.cacheRead ?? defaultCacheRead
      : pricing.cacheRead ?? defaultCacheRead,
  };
}

/**
 * Calculates cost for a request
 */
export function calculateCost(
  usage: TokenUsage,
  options: {
    modelId: string;
    serviceTier: ServiceTier;
    usesPromptCaching?: boolean;
  }
): CostCalculation {
  const { modelId, serviceTier, usesPromptCaching = false } = options;
  const pricing = getModelPricing(modelId, usage);
  const baselinePricing = getModelPricing(BASELINE_MODEL, usage);

  // Calculate base costs
  const inputCostPerToken = pricing.input / 1_000_000;
  const outputCostPerToken = pricing.output / 1_000_000;
  const reasoningCostPerToken = pricing.reasoning / 1_000_000;
  const cacheReadCostPerToken = pricing.cacheRead / 1_000_000;

  // Calculate effective input tokens (accounting for caching)
  const cachedTokens = usage.cachedInputTokens ?? 0;
  const uncachedInputTokens = Math.max(usage.inputTokens - cachedTokens, 0);
  
  // Base input cost (without optimizations)
  const baseInputCost = usage.inputTokens * inputCostPerToken;
  
  // Actual input cost with caching discount
  const actualInputCost = usesPromptCaching
    ? (uncachedInputTokens * inputCostPerToken) + (cachedTokens * cacheReadCostPerToken)
    : baseInputCost;

  // Output and reasoning costs
  const outputCost = usage.outputTokens * outputCostPerToken;
  const reasoningCost = (usage.reasoningTokens ?? 0) * reasoningCostPerToken;

  // Apply flex discount if applicable
  const flexMultiplier = serviceTier === "flex" ? (1 - FLEX_DISCOUNT) : 1.0;
  
  const totalCostBeforeFlex = actualInputCost + outputCost + reasoningCost;
  const totalCost = totalCostBeforeFlex * flexMultiplier;

  // Calculate savings
  const cachingSavings = usesPromptCaching 
    ? cachedTokens * Math.max(inputCostPerToken - cacheReadCostPerToken, 0)
    : 0;
  
  const flexSavings = serviceTier === "flex" 
    ? totalCostBeforeFlex * FLEX_DISCOUNT 
    : 0;

  // Model savings (vs baseline thinking model)
  const baselineTotalCost = 
    (usage.inputTokens * (baselinePricing.input / 1_000_000)) +
    (usage.outputTokens * (baselinePricing.output / 1_000_000)) +
    ((usage.reasoningTokens ?? 0) * (baselinePricing.reasoning / 1_000_000));
  
  const modelSavings = Math.max(0, baselineTotalCost - totalCostBeforeFlex);

  const totalSavings = cachingSavings + flexSavings + modelSavings;
  const baselineCost = baselineTotalCost;
  const reductionPercentage = baselineCost > 0 
    ? ((baselineCost - totalCost) / baselineCost) * 100 
    : 0;

  return {
    inputCost: actualInputCost * flexMultiplier,
    outputCost: outputCost * flexMultiplier,
    reasoningCost: reasoningCost * flexMultiplier,
    totalCost,
    cachingSavings,
    flexSavings,
    modelSavings,
    totalSavings,
    baselineCost,
    reductionPercentage,
  };
}

/**
 * Records a usage event
 */
export function recordUsage(event: Omit<UsageEvent, "id" | "timestamp">): UsageEvent {
  const fullEvent: UsageEvent = {
    ...event,
    id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
  };

  // Add to buffer
  usageBuffer.push(fullEvent);
  
  // Trim buffer if too large
  if (usageBuffer.length > MAX_BUFFER_SIZE) {
    usageBuffer.splice(0, usageBuffer.length - MAX_BUFFER_SIZE);
  }

  // Log for monitoring
  if (process.env.NEX_LOG_USAGE === "true") {
    logger.debug("[cost-monitor] Usage recorded:", {
      id: fullEvent.id,
      intent: fullEvent.intentCategory,
      model: fullEvent.modelId,
      tokens: fullEvent.usage.totalTokens,
      cost: fullEvent.cost.totalCost.toFixed(6),
      savings: fullEvent.cost.totalSavings.toFixed(6),
      reduction: `${fullEvent.cost.reductionPercentage.toFixed(1)}%`,
    });
  }

  return fullEvent;
}

/**
 * Gets usage statistics for a time period
 */
export function getUsageStats(
  options?: {
    periodStart?: Date;
    periodEnd?: Date;
    userId?: string;
    intentCategory?: IntentCategory;
  }
): UsageStats {
  const { 
    periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    periodEnd = new Date(),
    userId,
    intentCategory,
  } = options ?? {};

  // Filter events
  const filteredEvents = usageBuffer.filter(event => {
    if (event.timestamp < periodStart || event.timestamp > periodEnd) return false;
    if (userId && event.userId !== userId) return false;
    if (intentCategory && event.intentCategory !== intentCategory) return false;
    return true;
  });

  // Initialize stats
  const stats: UsageStats = {
    periodStart,
    periodEnd,
    totalRequests: filteredEvents.length,
    successfulRequests: filteredEvents.filter(e => e.success).length,
    failedRequests: filteredEvents.filter(e => !e.success).length,
    totalTokens: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    totalSavings: 0,
    averageReduction: 0,
    averageLatencyMs: 0,
    byIntent: {} as Record<IntentCategory, { requests: number; tokens: number; cost: number }>,
    byModel: {},
    byServiceTier: {} as Record<ServiceTier, { requests: number; tokens: number; cost: number; savings: number }>,
  };

  if (filteredEvents.length === 0) {
    return stats;
  }

  // Aggregate stats
  let totalReduction = 0;
  let totalLatency = 0;

  for (const event of filteredEvents) {
    stats.totalTokens += event.usage.totalTokens;
    stats.totalInputTokens += event.usage.inputTokens;
    stats.totalOutputTokens += event.usage.outputTokens;
    stats.totalCost += event.cost.totalCost;
    stats.totalSavings += event.cost.totalSavings;
    totalReduction += event.cost.reductionPercentage;
    totalLatency += event.latencyMs;

    // By intent
    if (!stats.byIntent[event.intentCategory]) {
      stats.byIntent[event.intentCategory] = { requests: 0, tokens: 0, cost: 0 };
    }
    stats.byIntent[event.intentCategory].requests += 1;
    stats.byIntent[event.intentCategory].tokens += event.usage.totalTokens;
    stats.byIntent[event.intentCategory].cost += event.cost.totalCost;

    // By model
    if (!stats.byModel[event.modelId]) {
      stats.byModel[event.modelId] = { requests: 0, tokens: 0, cost: 0 };
    }
    stats.byModel[event.modelId].requests += 1;
    stats.byModel[event.modelId].tokens += event.usage.totalTokens;
    stats.byModel[event.modelId].cost += event.cost.totalCost;

    // By service tier
    if (!stats.byServiceTier[event.serviceTier]) {
      stats.byServiceTier[event.serviceTier] = { requests: 0, tokens: 0, cost: 0, savings: 0 };
    }
    stats.byServiceTier[event.serviceTier].requests += 1;
    stats.byServiceTier[event.serviceTier].tokens += event.usage.totalTokens;
    stats.byServiceTier[event.serviceTier].cost += event.cost.totalCost;
    stats.byServiceTier[event.serviceTier].savings += event.cost.flexSavings;
  }

  stats.averageReduction = totalReduction / filteredEvents.length;
  stats.averageLatencyMs = totalLatency / filteredEvents.length;

  return stats;
}

/**
 * Gets the top cost-saving opportunities
 */
export function getOptimizationOpportunities(
  stats: UsageStats
): Array<{
  type: "flex" | "model" | "caching";
  category: IntentCategory | string;
  potentialSavings: number;
  recommendation: string;
}> {
  const opportunities: Array<{
    type: "flex" | "model" | "caching";
    category: IntentCategory | string;
    potentialSavings: number;
    recommendation: string;
  }> = [];

  // Check for high-cost intents not using flex
  for (const [intent, data] of Object.entries(stats.byIntent)) {
    if (data.cost > 0.01) { // More than 1 cent
      // Check if this intent could use flex
      const flexEligible = ["research", "analysis", "complex_task"].includes(intent);
      if (flexEligible) {
        const tierData = stats.byServiceTier["default"];
        if (tierData && tierData.requests > 0) {
          opportunities.push({
            type: "flex",
            category: intent as IntentCategory,
            potentialSavings: data.cost * 0.5, // 50% potential savings
            recommendation: `Enable Flex processing for ${intent} intent to save ~50%`,
          });
        }
      }
    }
  }

  // Check for premium models on simple tasks
  for (const [model, data] of Object.entries(stats.byModel)) {
    if (model.includes("5.1") || model.includes("thinking")) {
      // Check if being used for simple intents
      const simpleIntents = ["greeting", "price_check", "trending"];
      const simpleUsage = simpleIntents.reduce((sum, intent) => {
        return sum + (stats.byIntent[intent as IntentCategory]?.requests ?? 0);
      }, 0);
      
      if (simpleUsage > 0) {
        opportunities.push({
          type: "model",
          category: model,
          potentialSavings: data.cost * 0.8, // Could save 80% with nano model
          recommendation: `Use gpt-5-nano for simple intents instead of ${model}`,
        });
      }
    }
  }

  // Sort by potential savings
  opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);

  return opportunities.slice(0, 5); // Top 5 opportunities
}

/**
 * Formats cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 1000).toFixed(2)}m`; // Show in millicents
  }
  if (cost < 1) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Formats token count for display
 */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) {
    return tokens.toString();
  }
  if (tokens < 1_000_000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return `${(tokens / 1_000_000).toFixed(2)}M`;
}

/**
 * Creates a usage tracking wrapper for API calls
 */
export function createUsageTracker(context: {
  userId?: string;
  sessionId?: string;
  intentCategory: IntentCategory;
  modelId: string;
  modelTier: ModelTier;
  serviceTier: ServiceTier;
  costTier: CostTier;
}): {
  start: () => void;
  end: (result: { success: boolean; usage: TokenUsage; error?: string }) => UsageEvent;
} {
  let startTime: number;

  return {
    start: () => {
      startTime = Date.now();
    },
    end: ({ success, usage, error }) => {
      const latencyMs = Date.now() - startTime;
      const cost = calculateCost(usage, {
        modelId: context.modelId,
        serviceTier: context.serviceTier,
        usesPromptCaching: (usage.cachedInputTokens ?? 0) > 0,
      });

      return recordUsage({
        ...context,
        usage,
        cost,
        latencyMs,
        success,
        error,
      });
    },
  };
}

/**
 * Clears the usage buffer (for testing)
 */
export function clearUsageBuffer(): void {
  usageBuffer.length = 0;
}

/**
 * Gets raw usage events (for export/analysis)
 */
export function getUsageEvents(
  options?: {
    limit?: number;
    offset?: number;
    userId?: string;
  }
): UsageEvent[] {
  const { limit = 100, offset = 0, userId } = options ?? {};
  
  let events = [...usageBuffer];
  
  if (userId) {
    events = events.filter(e => e.userId === userId);
  }
  
  // Sort by timestamp descending (newest first)
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  return events.slice(offset, offset + limit);
}

/**
 * Estimates monthly cost based on current usage
 */
export function estimateMonthlyCost(stats: UsageStats): {
  projected: number;
  withOptimizations: number;
  potentialSavings: number;
} {
  const periodMs = stats.periodEnd.getTime() - stats.periodStart.getTime();
  const periodDays = periodMs / (24 * 60 * 60 * 1000);
  
  if (periodDays === 0) {
    return { projected: 0, withOptimizations: 0, potentialSavings: 0 };
  }

  const dailyRate = stats.totalCost / periodDays;
  const projected = dailyRate * 30;
  
  // Assume all optimizations are applied
  const optimizedDailyRate = (stats.totalCost - stats.totalSavings) / periodDays;
  const withOptimizations = optimizedDailyRate * 30;
  
  const potentialSavings = projected - withOptimizations;

  return {
    projected,
    withOptimizations,
    potentialSavings,
  };
}
