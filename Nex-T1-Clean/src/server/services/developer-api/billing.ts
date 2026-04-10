import "server-only";

import {
  getDeveloperBillingPlan,
  listDeveloperBillingPlans,
} from "@/server/services/developer-api/plan-registry";
import { calculateDeveloperRevenueAttribution } from "@/server/services/developer-api/billing-revenue";
import { getPublicProduct } from "@/server/services/developer-api/product-registry";
import { getProviderPricing } from "@/server/services/developer-api/provider-pricing";
import { getRuntimeCostConfig } from "@/server/services/developer-api/runtime-cost-registry";
import { getToolCostClass } from "@/server/services/developer-api/tool-cost-registry";
import type {
  DeveloperApiBill,
  DeveloperToolCallUsage,
  PublicDeveloperProductId,
} from "@/server/services/developer-api/types";

const CREDITS_PER_USD_COST = 300;

type CalculateDeveloperApiBillArgs = {
  productId: PublicDeveloperProductId;
  providerModel: string;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    reasoningTokens?: number;
    cachedInputTokens?: number;
  };
  toolCalls?: DeveloperToolCallUsage[];
  billingContext?: {
    planId?: string | null;
    includedCredits?: number | null;
    monthlyCreditsUsed?: number | null;
  };
};

type NormalizedDeveloperToolCallUsage = {
  toolName: string;
  callCount: number;
  runtimeMinutes: number;
};

function safeTokenCount(value: number | null | undefined): number {
  return Number.isFinite(value) && (value ?? 0) > 0 ? Math.floor(value ?? 0) : 0;
}

function normalizeToolCalls(
  toolCalls: DeveloperToolCallUsage[] | undefined,
): NormalizedDeveloperToolCallUsage[] {
  return (toolCalls ?? [])
    .filter((entry) => typeof entry.toolName === "string" && entry.toolName.length > 0)
    .map((entry) => ({
      toolName: entry.toolName,
      callCount:
        Number.isFinite(entry.callCount) && (entry.callCount ?? 0) > 0
          ? Math.floor(entry.callCount ?? 1)
          : 1,
      runtimeMinutes:
        Number.isFinite(entry.runtimeMinutes) && (entry.runtimeMinutes ?? 0) > 0
          ? Math.ceil(entry.runtimeMinutes ?? 0)
          : 0,
    }));
}

export function calculateDeveloperApiBill({
  productId,
  providerModel,
  usage,
  toolCalls,
  billingContext,
}: CalculateDeveloperApiBillArgs): DeveloperApiBill {
  const product = getPublicProduct(productId);
  const plan = getDeveloperBillingPlan(billingContext?.planId);
  const pricing = getProviderPricing(providerModel);
  const inputTokens = safeTokenCount(usage.inputTokens);
  const outputTokens = safeTokenCount(usage.outputTokens);
  const reasoningTokens = safeTokenCount(usage.reasoningTokens);
  const cachedInputTokens = safeTokenCount(usage.cachedInputTokens);

  const providerTokenCostUsd =
    (inputTokens / 1_000) * pricing.inputCostPer1kUsd +
    (outputTokens / 1_000) * pricing.outputCostPer1kUsd +
    (reasoningTokens / 1_000) * (pricing.reasoningCostPer1kUsd ?? 0) +
    (cachedInputTokens / 1_000) * (pricing.cachedInputCostPer1kUsd ?? 0);

  const normalizedToolCalls = normalizeToolCalls(toolCalls);
  const toolBreakdown = normalizedToolCalls.map((entry) => {
    const costClass = getToolCostClass(entry.toolName);
    if (!costClass) {
      return {
        toolName: entry.toolName,
        kind: "unknown" as const,
        costUsd: 0,
        runtimeMinutes: entry.runtimeMinutes,
      };
    }

    if (costClass.kind === "fixed_usd") {
      return {
        toolName: entry.toolName,
        kind: costClass.kind,
        costUsd: costClass.usdPerCall * entry.callCount,
        runtimeMinutes: entry.runtimeMinutes,
      };
    }

    if (costClass.kind === "metered_runtime") {
      const runtimeConfig = getRuntimeCostConfig(costClass.runtimeKind);
      const minutes = Math.max(entry.runtimeMinutes, runtimeConfig.minimumMinutes);
      return {
        toolName: entry.toolName,
        kind: costClass.kind,
        costUsd: minutes * runtimeConfig.usdPerMinute,
        runtimeMinutes: minutes,
      };
    }

    return {
      toolName: entry.toolName,
      kind: costClass.kind,
      costUsd: 0,
      runtimeMinutes: entry.runtimeMinutes,
    };
  });

  const toolCostUsd = toolBreakdown
    .filter((entry) => entry.kind === "fixed_usd")
    .reduce((total, entry) => total + entry.costUsd, 0);
  const runtimeCostUsd = toolBreakdown
    .filter((entry) => entry.kind === "metered_runtime")
    .reduce((total, entry) => total + entry.costUsd, 0);
  const totalCostUsd = providerTokenCostUsd + toolCostUsd + runtimeCostUsd;
  const rawCredits = Math.ceil(totalCostUsd * CREDITS_PER_USD_COST);
  const billedCredits = Math.max(product.minimumCredits, rawCredits);
  const revenueAttribution = calculateDeveloperRevenueAttribution({
    billedCredits,
    includedCredits:
      billingContext?.includedCredits ?? plan.includedCredits,
    monthlyCreditsUsed: billingContext?.monthlyCreditsUsed ?? 0,
    monthlyPriceUsd: plan.monthlyPriceUsd,
    overagePricePerThousandCreditsUsd:
      plan.overagePricePerThousandCreditsUsd,
  });

  return {
    billedCredits,
    productFloorCredits: product.minimumCredits,
    includedCreditsBilled: revenueAttribution.includedCreditsBilled,
    overageCreditsBilled: revenueAttribution.overageCreditsBilled,
    providerTokenCostUsd,
    toolCostUsd,
    runtimeCostUsd,
    totalCostUsd,
    includedRevenueUsd: revenueAttribution.includedRevenueUsd,
    overageRevenueUsd: revenueAttribution.overageRevenueUsd,
    billedRevenueUsd: revenueAttribution.billedRevenueUsd,
    grossMarginUsd: revenueAttribution.billedRevenueUsd - totalCostUsd,
    toolBreakdown,
  };
}

export {
  getDeveloperBillingPlan,
  getProviderPricing,
  getToolCostClass,
  listDeveloperBillingPlans,
};
