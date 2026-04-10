/**
 * Intent-Aware Model Router
 * 
 * Domain: AI
 * Responsibility: Dynamically selects optimal model based on intent complexity and cost
 * Depends on: intent-classifier, flex-router, config/models
 * Notes: Routes simple tasks to cheaper models, complex tasks to premium models.
 *        Can reduce costs by 40-80% through intelligent model selection.
 *        Reference: https://platform.openai.com/docs/guides/cost-optimization
 */

import type { IntentCategory, IntentClassification, ReasoningEffort } from "@/modules/chat/intent-classifier";
import { 
  type ServiceTier, 
  determineServiceTier, 
} from "@/server/services/ai-sdk/flex-router";

/**
 * Model tiers with capabilities and costs
 */
export type ModelTier = "nano" | "mini" | "standard" | "premium" | "thinking";

/**
 * Model specification with capabilities
 */
export type ModelSpec = {
  /** Model identifier */
  id: string;
  /** Model tier */
  tier: ModelTier;
  /** Human-readable name */
  name: string;
  /** Relative cost factor (1.0 = baseline mini) */
  costFactor: number;
  /** Whether model supports reasoning/thinking */
  supportsReasoning: boolean;
  /** Whether model supports vision/image input */
  supportsVision: boolean;
  /** Whether model supports tool calling */
  supportsTools: boolean;
  /** Context window size in tokens */
  contextWindow: number;
  /** Maximum output tokens */
  maxOutputTokens: number;
  /** Whether temperature can be set */
  supportsTemperature: boolean;
  /** Provider prefix for SDK */
  providerPrefix: string;
};

/**
 * User subscription tier
 */
export type UserTier = "free" | "pro" | "ultra" | "enterprise";

/**
 * Model routing decision
 */
export type ModelRoutingDecision = {
  /** Selected model ID */
  modelId: string;
  /** Full model path with provider prefix */
  fullModelPath: string;
  /** Model tier */
  tier: ModelTier;
  /** Cost factor relative to baseline */
  costFactor: number;
  /** Service tier for API request */
  serviceTier: ServiceTier;
  /** Whether flex processing is being used */
  usesFlex: boolean;
  /** Routing reason for logging/debugging */
  routingReason: string;
  /** Fallback models in order of preference */
  fallbacks: string[];
  /** Estimated cost reduction percentage */
  estimatedCostReduction: number;
  /** Model capabilities */
  capabilities: {
    reasoning: boolean;
    vision: boolean;
    tools: boolean;
    temperature: boolean;
  };
};

/**
 * Model specifications catalog - Vercel AI Gateway models
 * 
 * All models use Vercel AI Gateway format with provider/ prefix
 * Reference: https://vercel.com/docs/ai-gateway/models-and-providers
 * 
 * IMPORTANT: GPT-5 and GPT-5.4 models require both reasoningEffort and reasoningSummary
 * in providerOptions to receive reasoning output.
 * Reference: https://vercel.com/docs/ai-gateway/provider-options#reasoning
 */
const MODEL_SPECS: Record<string, ModelSpec> = {
  // Nano tier - GPT-5 nano (ultra-fast, cheapest) - DOCUMENTED
  "gpt-5-nano": {
    id: "gpt-5-nano",
    tier: "nano",
    name: "GPT-5 Nano",
    costFactor: 0.1,
    supportsReasoning: false,
    supportsVision: true,
    supportsTools: true,
    contextWindow: 32000,
    maxOutputTokens: 8192,
    supportsTemperature: true,
    providerPrefix: "openai",
  },

  // Standard tier - GPT-5 (reasoning capable) - DOCUMENTED
  "gpt-5": {
    id: "gpt-5",
    tier: "standard",
    name: "GPT-5",
    costFactor: 1.0,
    supportsReasoning: true,
    supportsVision: true,
    supportsTools: true,
    contextWindow: 200000,
    maxOutputTokens: 32768,
    supportsTemperature: true,
    providerPrefix: "openai",
  },

  // Thinking tier - GPT-5.4 (advanced reasoning) - DOCUMENTED
  "gpt-5.4": {
    id: "gpt-5.4",
    tier: "thinking",
    name: "GPT-5.4",
    costFactor: 2.0,
    supportsReasoning: true,
    supportsVision: true,
    supportsTools: true,
    contextWindow: 1_050_000,
    maxOutputTokens: 128000,
    supportsTemperature: true,
    providerPrefix: "openai",
  },
  
  // GPT-4 models (well documented, reliable fallbacks)
  "gpt-4o": {
    id: "gpt-4o",
    tier: "standard",
    name: "GPT-4o",
    costFactor: 1.0,
    supportsReasoning: false,
    supportsVision: true,
    supportsTools: true,
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsTemperature: true,
    providerPrefix: "openai",
  },

  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    tier: "nano",
    name: "GPT-4o Mini",
    costFactor: 0.15,
    supportsReasoning: false,
    supportsVision: true,
    supportsTools: true,
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsTemperature: true,
    providerPrefix: "openai",
  },

  "gpt-4.1-mini": {
    id: "gpt-4.1-mini",
    tier: "mini",
    name: "GPT-4.1 Mini",
    costFactor: 0.2,
    supportsReasoning: false,
    supportsVision: true,
    supportsTools: true,
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsTemperature: true,
    providerPrefix: "openai",
  },
  
  // Google Gemini - DOCUMENTED
  "gemini-2.0-flash": {
    id: "gemini-2.0-flash",
    tier: "standard",
    name: "Gemini 2.0 Flash",
    costFactor: 0.8,
    supportsReasoning: false,
    supportsVision: true,
    supportsTools: true,
    contextWindow: 1000000,
    maxOutputTokens: 65536,
    supportsTemperature: true,
    providerPrefix: "google",
  },
  
  // xAI Grok - DOCUMENTED
  "grok-4": {
    id: "grok-4",
    tier: "premium",
    name: "Grok 4",
    costFactor: 1.5,
    supportsReasoning: true,
    supportsVision: true,
    supportsTools: true,
    contextWindow: 256000,
    maxOutputTokens: 32768,
    supportsTemperature: true,
    providerPrefix: "xai",
  },

  "grok-3": {
    id: "grok-3",
    tier: "standard",
    name: "Grok 3",
    costFactor: 1.0,
    supportsReasoning: false,
    supportsVision: true,
    supportsTools: true,
    contextWindow: 131072,
    maxOutputTokens: 8192,
    supportsTemperature: true,
    providerPrefix: "xai",
  },

  // Anthropic - DOCUMENTED
  "claude-sonnet-4": {
    id: "claude-sonnet-4",
    tier: "standard",
    name: "Claude Sonnet 4",
    costFactor: 1.0,
    supportsReasoning: false,
    supportsVision: true,
    supportsTools: true,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportsTemperature: true,
    providerPrefix: "anthropic",
  },
};

/**
 * Intent to model tier mapping
 */
const INTENT_MODEL_TIER_MAP: Record<IntentCategory, ModelTier> = {
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
  smart_contract: "thinking",
  complex_task: "thinking",
  // New categories
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

/**
 * Fallback chains for each tier - Vercel AI Gateway models
 * Each tier falls back to the next lower tier's primary model
 * Uses documented model names only
 */
const TIER_FALLBACKS: Record<ModelTier, string[]> = {
  nano: ["gpt-5-nano", "gpt-5-mini", "gpt-4.1-mini"],
  mini: ["gpt-5-mini", "gpt-5-nano", "gpt-4o-mini"],
  standard: ["gpt-5.4", "gpt-5", "gpt-4o"],
  premium: ["gpt-5.4", "gpt-5", "grok-4"],
  thinking: ["gpt-5.4", "gpt-5", "gpt-4o"],
};

/**
 * User tier model restrictions
 */
const USER_TIER_MAX_MODEL: Record<UserTier, ModelTier> = {
  free: "mini",
  pro: "premium",
  ultra: "thinking",
  enterprise: "thinking",
};

/**
 * Routes a request to the optimal model based on intent and cost considerations
 * 
 * @param classification - Intent classification
 * @param options - Additional routing options
 * @returns Model routing decision
 */
export function routeToModel(
  classification: IntentClassification,
  options: {
    /** User subscription tier */
    userTier?: UserTier;
    /** Override to force a specific model */
    forceModel?: string;
    /** Whether to allow premium models */
    allowPremium?: boolean;
    /** Whether vision capability is required */
    requiresVision?: boolean;
    /** Whether to prioritize cost over capability */
    prioritizeCost?: boolean;
    /** Whether this is a background job */
    isBackgroundJob?: boolean;
    /** Maximum acceptable latency in ms */
    maxLatencyMs?: number;
  } = {}
): ModelRoutingDecision {
  const {
    userTier = "pro",
    forceModel,
    allowPremium = true,
    requiresVision = false,
    prioritizeCost = false,
    isBackgroundJob = false,
    maxLatencyMs,
  } = options;

  // Handle forced model override
  if (forceModel && MODEL_SPECS[forceModel]) {
    const spec = MODEL_SPECS[forceModel];
    const flexConfig = determineServiceTier(classification, { isBackgroundJob });
    
    return {
      modelId: spec.id,
      fullModelPath: `${spec.providerPrefix}/${spec.id}`,
      tier: spec.tier,
      costFactor: spec.costFactor,
      serviceTier: flexConfig.serviceTier,
      usesFlex: flexConfig.flexEligible,
      routingReason: "forced_model_override",
      fallbacks: TIER_FALLBACKS[spec.tier].filter(m => m !== spec.id),
      estimatedCostReduction: 0,
      capabilities: {
        reasoning: spec.supportsReasoning,
        vision: spec.supportsVision,
        tools: spec.supportsTools,
        temperature: spec.supportsTemperature,
      },
    };
  }

  // Determine base model tier from intent
  let targetTier = INTENT_MODEL_TIER_MAP[classification.category];

  // Upgrade tier based on reasoning effort
  if (classification.reasoningEffort === "high" && targetTier === "standard") {
    targetTier = "premium";
  }

  // Downgrade if prioritizing cost
  if (prioritizeCost) {
    const downgradeMap: Record<ModelTier, ModelTier> = {
      thinking: "premium",
      premium: "standard",
      standard: "mini",
      mini: "nano",
      nano: "nano",
    };
    targetTier = downgradeMap[targetTier];
  }

  // Apply user tier restrictions
  const maxTier = USER_TIER_MAX_MODEL[userTier];
  const tierRanking: ModelTier[] = ["nano", "mini", "standard", "premium", "thinking"];
  const maxTierIndex = tierRanking.indexOf(maxTier);
  const currentTierIndex = tierRanking.indexOf(targetTier);
  
  if (currentTierIndex > maxTierIndex) {
    targetTier = maxTier;
  }

  // Restrict premium if not allowed
  if (!allowPremium && (targetTier === "premium" || targetTier === "thinking")) {
    targetTier = "standard";
  }

  // Select model from tier
  let selectedModel = TIER_FALLBACKS[targetTier][0];
  let spec = MODEL_SPECS[selectedModel];

  // Check for vision requirement
  if (requiresVision && !spec.supportsVision) {
    // Find a model in the same tier that supports vision
    const visionModel = Object.values(MODEL_SPECS).find(
      m => m.tier === targetTier && m.supportsVision
    );
    if (visionModel) {
      selectedModel = visionModel.id;
      spec = visionModel;
    }
  }

  // Determine service tier (flex vs default)
  const flexConfig = determineServiceTier(classification, {
    isBackgroundJob,
    maxLatencyMs,
  });

  // Calculate estimated cost reduction
  const _baselineCostFactor = MODEL_SPECS["gpt-4.1-mini"]?.costFactor ?? 0.25; // Use mini as baseline
  const flexMultiplier = flexConfig.flexEligible ? 0.5 : 1.0;
  const modelSavings = (1 - (spec.costFactor / 4.0)) * 100; // vs thinking tier
  const flexSavings = flexConfig.flexEligible ? 50 : 0;
  const estimatedCostReduction = Math.min(90, modelSavings + flexSavings);

  return {
    modelId: spec.id,
    fullModelPath: `${spec.providerPrefix}/${spec.id}`,
    tier: spec.tier,
    costFactor: spec.costFactor * flexMultiplier,
    serviceTier: flexConfig.serviceTier,
    usesFlex: flexConfig.flexEligible,
    routingReason: `intent_${classification.category}_tier_${targetTier}_reasoning_${classification.reasoningEffort}`,
    fallbacks: TIER_FALLBACKS[targetTier].filter(m => m !== selectedModel),
    estimatedCostReduction,
    capabilities: {
      reasoning: spec.supportsReasoning,
      vision: spec.supportsVision,
      tools: spec.supportsTools,
      temperature: spec.supportsTemperature,
    },
  };
}

/**
 * Gets the model spec for a given model ID
 */
export function getModelSpec(modelId: string): ModelSpec | null {
  // Handle provider prefixed IDs
  const normalizedId = modelId.includes("/") 
    ? modelId.split("/").pop() ?? modelId 
    : modelId;
  
  return MODEL_SPECS[normalizedId] ?? null;
}

/**
 * Checks if a model supports reasoning mode
 */
export function modelSupportsReasoning(modelId: string): boolean {
  const spec = getModelSpec(modelId);
  return spec?.supportsReasoning ?? false;
}

/**
 * Checks if a model supports temperature setting
 */
export function modelSupportsTemperature(modelId: string): boolean {
  const spec = getModelSpec(modelId);
  return spec?.supportsTemperature ?? true;
}

/**
 * Gets the context window size for a model
 */
export function getModelContextWindow(modelId: string): number {
  const spec = getModelSpec(modelId);
  return spec?.contextWindow ?? 128000;
}

/**
 * Gets all available models for a given tier
 */
export function getModelsForTier(tier: ModelTier): ModelSpec[] {
  return Object.values(MODEL_SPECS).filter(m => m.tier === tier);
}

/**
 * Validates that a model selection is appropriate for the intent
 * Returns warnings if the selection seems suboptimal
 */
export function validateModelSelection(
  modelId: string,
  classification: IntentClassification
): {
  isOptimal: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const spec = getModelSpec(modelId);
  if (!spec) {
    return {
      isOptimal: false,
      warnings: [`Unknown model: ${modelId}`],
      recommendations: ["Use a known model ID"],
    };
  }

  const warnings: string[] = [];
  const recommendations: string[] = [];
  const optimalTier = INTENT_MODEL_TIER_MAP[classification.category];

  // Check for over-provisioning
  const tierRanking: ModelTier[] = ["nano", "mini", "standard", "premium", "thinking"];
  const optimalIndex = tierRanking.indexOf(optimalTier);
  const actualIndex = tierRanking.indexOf(spec.tier);

  if (actualIndex > optimalIndex + 1) {
    warnings.push(`Model ${modelId} (${spec.tier}) may be over-provisioned for ${classification.category}`);
    recommendations.push(`Consider using ${TIER_FALLBACKS[optimalTier][0]} for better cost efficiency`);
  }

  // Check for under-provisioning
  if (actualIndex < optimalIndex - 1) {
    warnings.push(`Model ${modelId} (${spec.tier}) may be under-provisioned for ${classification.category}`);
    recommendations.push(`Consider upgrading to ${TIER_FALLBACKS[optimalTier][0]} for better quality`);
  }

  // Check reasoning capability match
  if (classification.reasoningEffort === "high" && !spec.supportsReasoning) {
    warnings.push(`Model ${modelId} doesn't support reasoning but high reasoning effort requested`);
    recommendations.push("Use o1 or o1-mini for complex reasoning tasks");
  }

  return {
    isOptimal: warnings.length === 0,
    warnings,
    recommendations,
  };
}

/**
 * Estimates cost for a request based on model and token counts
 */
export function estimateRequestCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  usesFlex: boolean = false
): {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  flexSavings: number;
} {
  const spec = getModelSpec(modelId);
  if (!spec) {
    return { inputCost: 0, outputCost: 0, totalCost: 0, flexSavings: 0 };
  }

  // Base pricing per 1M tokens (approximate)
  const BASE_INPUT_PRICE = 0.15; // gpt-4o-mini baseline
  const BASE_OUTPUT_PRICE = 0.60;

  const inputPrice = BASE_INPUT_PRICE * spec.costFactor;
  const outputPrice = BASE_OUTPUT_PRICE * spec.costFactor;

  const flexMultiplier = usesFlex ? 0.5 : 1.0;

  const inputCost = (inputTokens / 1_000_000) * inputPrice * flexMultiplier;
  const outputCost = (outputTokens / 1_000_000) * outputPrice * flexMultiplier;
  const totalCost = inputCost + outputCost;

  const standardCost = (inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice;
  const flexSavings = usesFlex ? standardCost - totalCost : 0;

  return {
    inputCost,
    outputCost,
    totalCost,
    flexSavings,
  };
}

/**
 * Helper to build model parameters based on capabilities
 */
export function buildModelParameters(
  modelId: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    reasoningEffort?: ReasoningEffort;
  } = {}
): Record<string, UntypedJson> {
  const spec = getModelSpec(modelId);
  const params: Record<string, UntypedJson> = {};

  // Only include temperature if model supports it
  if (spec?.supportsTemperature && options.temperature !== undefined) {
    params.temperature = options.temperature;
  }

  // Include max tokens if specified
  if (options.maxTokens !== undefined) {
    params.maxTokens = Math.min(
      options.maxTokens,
      spec?.maxOutputTokens ?? options.maxTokens
    );
  }

  // Include reasoning effort for reasoning models
  if (spec?.supportsReasoning && options.reasoningEffort) {
    params.reasoning = {
      effort: options.reasoningEffort,
    };
  }

  return params;
}

/**
 * Maps a model ID to its tier for access control checks
 */
export function mapModelIdToTier(modelId: string): ModelTier {
  const spec = getModelSpec(modelId);
  return spec?.tier ?? "mini"; // Default to mini tier for unknown models
}

// Export constants for external use
export { USER_TIER_MAX_MODEL };
