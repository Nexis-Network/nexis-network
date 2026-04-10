import "server-only";

type CalculateDeveloperRevenueAttributionArgs = {
  billedCredits: number;
  includedCredits: number;
  monthlyCreditsUsed: number;
  monthlyPriceUsd: number;
  overagePricePerThousandCreditsUsd: number;
};

type DeveloperRevenueAttribution = {
  includedCreditsBilled: number;
  overageCreditsBilled: number;
  includedRevenueUsd: number;
  overageRevenueUsd: number;
  billedRevenueUsd: number;
};

function safeWholeCount(value: number | null | undefined): number {
  return Number.isFinite(value) && (value ?? 0) > 0 ? Math.floor(value ?? 0) : 0;
}

export function calculateDeveloperRevenueAttribution({
  billedCredits,
  includedCredits,
  monthlyCreditsUsed,
  monthlyPriceUsd,
  overagePricePerThousandCreditsUsd,
}: CalculateDeveloperRevenueAttributionArgs): DeveloperRevenueAttribution {
  const normalizedBilledCredits = safeWholeCount(billedCredits);
  const normalizedIncludedCredits = safeWholeCount(includedCredits);
  const remainingIncludedCredits = Math.max(
    normalizedIncludedCredits - safeWholeCount(monthlyCreditsUsed),
    0,
  );
  const includedCreditsBilled = Math.min(
    normalizedBilledCredits,
    remainingIncludedCredits,
  );
  const overageCreditsBilled = normalizedBilledCredits - includedCreditsBilled;
  const includedRevenueUsd =
    normalizedIncludedCredits > 0
      ? includedCreditsBilled * (monthlyPriceUsd / normalizedIncludedCredits)
      : 0;
  const overageRevenueUsd =
    overageCreditsBilled * (overagePricePerThousandCreditsUsd / 1_000);

  return {
    includedCreditsBilled,
    overageCreditsBilled,
    includedRevenueUsd,
    overageRevenueUsd,
    billedRevenueUsd: includedRevenueUsd + overageRevenueUsd,
  };
}
