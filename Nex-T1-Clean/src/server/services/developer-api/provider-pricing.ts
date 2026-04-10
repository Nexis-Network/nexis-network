import "server-only";

import type { ProviderPricing } from "@/server/services/developer-api/types";

const PROVIDER_PRICING: Record<string, ProviderPricing> = {
  "openai/gpt-5.4": {
    provider: "openai",
    model: "openai/gpt-5.4",
    inputCostPer1kUsd: 0.0025,
    outputCostPer1kUsd: 0.015,
  },
  "xai/grok-4.20-non-reasoning": {
    provider: "xai",
    model: "xai/grok-4.20-non-reasoning",
    inputCostPer1kUsd: 0.002,
    outputCostPer1kUsd: 0.006,
  },
  "anthropic/claude-opus-4.1": {
    provider: "anthropic",
    model: "anthropic/claude-opus-4.1",
    inputCostPer1kUsd: 0.015,
    outputCostPer1kUsd: 0.075,
  },
};

export function getProviderPricing(modelId: string): ProviderPricing {
  const pricing = PROVIDER_PRICING[modelId];
  if (!pricing) {
    throw new Error(`Unsupported provider pricing model: ${modelId}`);
  }
  return pricing;
}

export function listProviderPricing(): ProviderPricing[] {
  return Object.values(PROVIDER_PRICING);
}
