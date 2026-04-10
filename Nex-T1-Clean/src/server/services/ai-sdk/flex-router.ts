/**
 * Flex Processing Router
 * 
 * Domain: ai-sdk
 * Responsibility: Routes API requests to appropriate OpenAI service tiers for cost optimization
 * Depends on: intent-classifier
 * Notes: Flex Processing offers Batch API pricing (~50% savings) in exchange for slower responses.
 *        Best suited for non-urgent async tasks like research, analysis, data enrichment.
 *        Reference: https://platform.openai.com/docs/guides/flex-processing
 */

import type { IntentCategory, IntentClassification, ReasoningEffort } from "@/modules/chat/intent-classifier";
import {
  COST_TIER_FACTORS,
  COST_TIER_MODELS,
  FLEX_ELIGIBLE_INTENTS,
  FLEX_ENV,
  FLEX_MODEL_PRICING,
  INTENT_COST_TIER_MAP,
  REALTIME_REQUIRED_INTENTS,
} from "@/server/services/ai-sdk/flex-router-config";

/**
 * OpenAI Service Tiers
 * - auto: Let OpenAI decide (default behavior, may get flex pricing if available)
 * - default: Standard real-time processing, fastest but highest cost
 * - flex: Batch API pricing for slower response times (~50% cost reduction)
 */
export type ServiceTier = "auto" | "default" | "flex";

/**
 * Cost tier classification for model routing
 * Determines which model complexity should be used based on task requirements
 */
export type CostTier = "nano" | "mini" | "standard" | "premium";

/**
 * Configuration for a flex-eligible request
 */
export type FlexRequestConfig = {
  /** The service tier to use */
  serviceTier: ServiceTier;
  /** Whether this request is eligible for flex processing */
  flexEligible: boolean;
  /** Reason for the routing decision */
  routingReason: string;
  /** Estimated cost multiplier (1.0 = baseline, 0.5 = 50% savings) */
  estimatedCostMultiplier: number;
  /** Whether the user explicitly requested fast/slow processing */
  userPreferenceOverride: boolean;
};

/**
 * Cost tier configuration with model recommendations
 */
export type CostTierConfig = {
  /** The cost tier classification */
  costTier: CostTier;
  /** Recommended model for this tier */
  recommendedModel: string;
  /** Fallback models in order of preference */
  fallbackModels: string[];
  /** Estimated relative cost factor */
  costFactor: number;
  /** Reason for model selection */
  selectionReason: string;
};

/**
 * Determines the optimal service tier for a request based on intent classification
 * and user preferences.
 * 
 * @param classification - The intent classification for the request
 * @param options - Additional options for routing
 * @returns FlexRequestConfig with routing decision
 */
export function determineServiceTier(
  classification: IntentClassification,
  options: {
    /** Whether this is a background/async job (not user-facing) */
    isBackgroundJob?: boolean;
    /** Whether user explicitly requested fast response */
    userRequestedFast?: boolean;
    /** Whether user explicitly accepted slow processing */
    userAcceptedSlow?: boolean;
    /** Custom latency tolerance in ms */
    maxLatencyMs?: number;
  } = {}
): FlexRequestConfig {
  const { 
    isBackgroundJob = false, 
    userRequestedFast = false,
    userAcceptedSlow = false,
    maxLatencyMs,
  } = options;

  // Force mode overrides (for testing/debugging)
  if (FLEX_ENV.FORCE_REALTIME_MODE) {
    return {
      serviceTier: "default",
      flexEligible: false,
      routingReason: "forced_realtime_mode",
      estimatedCostMultiplier: 1.0,
      userPreferenceOverride: false,
    };
  }

  if (FLEX_ENV.FORCE_FLEX_MODE) {
    return {
      serviceTier: "flex",
      flexEligible: true,
      routingReason: "forced_flex_mode",
      estimatedCostMultiplier: 0.5,
      userPreferenceOverride: false,
    };
  }

  // Check if flex is globally disabled
  if (!FLEX_ENV.FLEX_ENABLED) {
    return {
      serviceTier: "auto",
      flexEligible: false,
      routingReason: "flex_disabled_globally",
      estimatedCostMultiplier: 1.0,
      userPreferenceOverride: false,
    };
  }

  // User preference overrides
  if (userRequestedFast) {
    return {
      serviceTier: "default",
      flexEligible: false,
      routingReason: "user_requested_fast",
      estimatedCostMultiplier: 1.0,
      userPreferenceOverride: true,
    };
  }

  if (userAcceptedSlow) {
    return {
      serviceTier: "flex",
      flexEligible: true,
      routingReason: "user_accepted_slow",
      estimatedCostMultiplier: 0.5,
      userPreferenceOverride: true,
    };
  }

  // Background jobs always use flex if enabled
  if (isBackgroundJob && FLEX_ENV.FLEX_DEFAULT_FOR_ASYNC) {
    return {
      serviceTier: "flex",
      flexEligible: true,
      routingReason: "background_job_async",
      estimatedCostMultiplier: 0.5,
      userPreferenceOverride: false,
    };
  }

  // Real-time required intents must use default tier
  if (REALTIME_REQUIRED_INTENTS.has(classification.category)) {
    return {
      serviceTier: "default",
      flexEligible: false,
      routingReason: `realtime_required_intent_${classification.category}`,
      estimatedCostMultiplier: 1.0,
      userPreferenceOverride: false,
    };
  }

  // Flex-eligible intents
  if (FLEX_ELIGIBLE_INTENTS.has(classification.category)) {
    // Estimate latency based on cost tier (higher tier = more processing time)
    const tier = INTENT_COST_TIER_MAP[classification.category];
    const estimatedLatencyMs = tier === "premium" ? 30000 : tier === "standard" ? 15000 : 5000;
    
    // Check latency tolerance if specified
    if (maxLatencyMs && maxLatencyMs < estimatedLatencyMs * 2) {
      return {
        serviceTier: "auto",
        flexEligible: false,
        routingReason: "latency_constraint",
        estimatedCostMultiplier: 0.75, // May get flex pricing opportunistically
        userPreferenceOverride: false,
      };
    }

    return {
      serviceTier: "flex",
      flexEligible: true,
      routingReason: `flex_eligible_intent_${classification.category}`,
      estimatedCostMultiplier: 0.5,
      userPreferenceOverride: false,
    };
  }

  // Default: use auto to let OpenAI optimize
  return {
    serviceTier: "auto",
    flexEligible: false,
    routingReason: "default_auto_routing",
    estimatedCostMultiplier: 0.75, // May benefit from opportunistic flex
    userPreferenceOverride: false,
  };
}

/**
 * Determines the optimal cost tier and model for a given intent classification.
 * Uses intent complexity and reasoning effort to select appropriate model.
 * 
 * @param classification - The intent classification
 * @param options - Additional routing options
 * @returns CostTierConfig with model recommendations
 */
export function determineCostTier(
  classification: IntentClassification,
  options: {
    /** Override to force a specific tier */
    forceTier?: CostTier;
    /** Whether to allow premium models */
    allowPremium?: boolean;
    /** Current user's tier/subscription level */
    userTier?: "free" | "pro" | "ultra" | "enterprise";
  } = {}
): CostTierConfig {
  const { forceTier, allowPremium = true, userTier = "pro" } = options;

  // Honor forced tier
  if (forceTier) {
    const models = COST_TIER_MODELS[forceTier];
    return {
      costTier: forceTier,
      recommendedModel: models.primary,
      fallbackModels: models.fallbacks,
      costFactor: COST_TIER_FACTORS[forceTier],
      selectionReason: "forced_tier_override",
    };
  }

  // Determine base tier from intent
  let baseTier = INTENT_COST_TIER_MAP[classification.category];

  // Upgrade based on reasoning effort
  if (classification.reasoningEffort === "high" && baseTier !== "premium") {
    baseTier = "standard";
  }

  // Downgrade premium if not allowed
  if (baseTier === "premium" && !allowPremium) {
    baseTier = "standard";
  }

  // Free tier users can only use nano/mini
  if (userTier === "free" && (baseTier === "premium" || baseTier === "standard")) {
    baseTier = "mini";
  }

  const models = COST_TIER_MODELS[baseTier];
  
  return {
    costTier: baseTier,
    recommendedModel: models.primary,
    fallbackModels: models.fallbacks,
    costFactor: COST_TIER_FACTORS[baseTier],
    selectionReason: `intent_${classification.category}_reasoning_${classification.reasoningEffort}`,
  };
}

/**
 * Builds the service_tier parameter for OpenAI API requests.
 * Returns undefined if the default tier should be used.
 * 
 * @param config - The flex request configuration
 * @returns The service_tier value to pass to the API, or undefined
 */
export function buildServiceTierParam(config: FlexRequestConfig): "auto" | "flex" | undefined {
  switch (config.serviceTier) {
    case "flex":
      return "flex";
    case "auto":
      return "auto";
    case "default":
      // Default behavior - don't pass the parameter
      return undefined;
    default:
      return undefined;
  }
}

/**
 * Estimates the cost savings from using flex processing.
 * 
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param usesFlex - Whether flex processing is being used
 * @param model - The model being used
 * @returns Estimated cost information
 */
export function estimateCostSavings(
  inputTokens: number,
  outputTokens: number,
  usesFlex: boolean,
  model: string = "gpt-5-mini"
): {
  estimatedCost: number;
  flexSavings: number;
  savingsPercentage: number;
} {
  // Normalize model name (strip provider prefix if present)
  const normalizedModel = model.includes("/") ? model.split("/").pop() ?? model : model;
  const pricing = FLEX_MODEL_PRICING[normalizedModel] ?? FLEX_MODEL_PRICING["gpt-5-mini"];
  const useLongContext =
    typeof pricing.longContextThreshold === "number" &&
    inputTokens > pricing.longContextThreshold;
  const inputPrice = useLongContext ? pricing.longContextInput ?? pricing.input : pricing.input;
  const outputPrice = useLongContext
    ? pricing.longContextOutput ?? pricing.output
    : pricing.output;
  const flexDiscount = 0.5; // 50% discount for flex

  const baseInputCost = (inputTokens / 1_000_000) * inputPrice;
  const baseOutputCost = (outputTokens / 1_000_000) * outputPrice;
  const baseCost = baseInputCost + baseOutputCost;

  if (usesFlex) {
    const flexCost = baseCost * flexDiscount;
    return {
      estimatedCost: flexCost,
      flexSavings: baseCost - flexCost,
      savingsPercentage: 50,
    };
  }

  return {
    estimatedCost: baseCost,
    flexSavings: 0,
    savingsPercentage: 0,
  };
}

/**
 * Checks if a request should be eligible for flex based on various signals.
 * This is a comprehensive check that considers multiple factors.
 * 
 * @param params - Various parameters to consider
 * @returns Whether the request is flex-eligible
 */
export function isFlexEligible(params: {
  intentCategory: IntentCategory;
  reasoningEffort: ReasoningEffort;
  isBackgroundJob?: boolean;
  hasAttachments?: boolean;
  userTier?: string;
  estimatedLatencyMs?: number;
}): boolean {
  const {
    intentCategory,
    isBackgroundJob = false,
    hasAttachments = false,
    estimatedLatencyMs,
  } = params;

  // Background jobs are always eligible
  if (isBackgroundJob) return true;

  // Real-time intents are never eligible
  if (REALTIME_REQUIRED_INTENTS.has(intentCategory)) return false;

  // Flex-eligible intents
  if (FLEX_ELIGIBLE_INTENTS.has(intentCategory)) return true;

  // Attachments suggest longer processing - could use flex
  if (hasAttachments) return true;

  // High estimated latency suggests complex task - could benefit from flex
  if (estimatedLatencyMs && estimatedLatencyMs > 5000) return true;

  return false;
}

/**
 * Type guard for service tier values
 */
export function isValidServiceTier(value: UntypedJson): value is ServiceTier {
  return value === "auto" || value === "default" || value === "flex";
}

/**
 * Type guard for cost tier values
 */
export function isValidCostTier(value: UntypedJson): value is CostTier {
  return value === "nano" || value === "mini" || value === "standard" || value === "premium";
}
