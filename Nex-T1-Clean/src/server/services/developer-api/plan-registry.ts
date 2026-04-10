import "server-only";

import type {
  DeveloperBillingPlan,
  DeveloperBillingPlanId,
} from "@/server/services/developer-api/types";

const BILLING_PLANS: Record<DeveloperBillingPlanId, DeveloperBillingPlan> = {
  launch: {
    id: "launch",
    label: "Launch",
    monthlyPriceUsd: 49,
    includedCredits: 5_000,
    requestsPerMinute: 60,
    overagePricePerThousandCreditsUsd: 12,
  },
  build: {
    id: "build",
    label: "Build",
    monthlyPriceUsd: 199,
    includedCredits: 25_000,
    requestsPerMinute: 300,
    overagePricePerThousandCreditsUsd: 11,
  },
  scale: {
    id: "scale",
    label: "Scale",
    monthlyPriceUsd: 799,
    includedCredits: 120_000,
    requestsPerMinute: 1_200,
    overagePricePerThousandCreditsUsd: 10,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    monthlyPriceUsd: 0,
    includedCredits: 0,
    requestsPerMinute: 1_200,
    overagePricePerThousandCreditsUsd: 10,
    notes: "Annual commit and negotiated pricing after observed blended margin.",
  },
};

export function getDeveloperBillingPlan(
  planId: DeveloperBillingPlanId | string | null | undefined,
): DeveloperBillingPlan {
  if (!planId) {
    return BILLING_PLANS.launch;
  }

  return BILLING_PLANS[planId as DeveloperBillingPlanId] ?? BILLING_PLANS.launch;
}

export function listDeveloperBillingPlans(): DeveloperBillingPlan[] {
  return Object.values(BILLING_PLANS);
}
