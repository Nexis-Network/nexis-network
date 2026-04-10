import type { CreditTier } from "@/server/services/credits/credit-service";

function resolveStripePriceId(
  publicEnvName: string,
  serverEnvName: string,
  fallback: string,
): string {
  return process.env[publicEnvName] ?? process.env[serverEnvName] ?? fallback;
}

const LEGACY_STRIPE_SUBSCRIPTION_PRICE_IDS: Record<CreditTier, string[]> = {
  free: [],
  pro: ["price_1T2vgkAeeadhJmGIk032Xc1o", "price_1T2vgkAeeadhJmGIuoI2LqHh"],
  trader: ["price_1T2vglAeeadhJmGIFrN6Mbty", "price_1T2vglAeeadhJmGIO4IDVbAP"],
  ultra: ["price_1T2vglAeeadhJmGIG3H2kNEC", "price_1T2vgmAeeadhJmGIuEyBjNMG"],
  enterprise: ["price_1T2vgmAeeadhJmGIm2AjLwsK", "price_1T2vgnAeeadhJmGIeEhlj5re"],
};

export const STRIPE_DEFAULT_PRO_PRICE_ID = resolveStripePriceId(
  "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID",
  "STRIPE_PRO_PRICE_ID",
  "price_1T8uisAeeadhJmGIl6SfYLiK",
);
export const STRIPE_DEFAULT_TRADER_PRICE_ID = resolveStripePriceId(
  "NEXT_PUBLIC_STRIPE_TRADER_PRICE_ID",
  "STRIPE_TRADER_PRICE_ID",
  "price_1T8uitAeeadhJmGIthlILzXg",
);
export const STRIPE_DEFAULT_ULTRA_PRICE_ID = resolveStripePriceId(
  "NEXT_PUBLIC_STRIPE_ULTRA_PRICE_ID",
  "STRIPE_ULTRA_PRICE_ID",
  "price_1T8uiuAeeadhJmGISbuYYv7V",
);
export const STRIPE_DEFAULT_ENTERPRISE_PRICE_ID = resolveStripePriceId(
  "NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID",
  "STRIPE_ENTERPRISE_PRICE_ID",
  "price_1T8uivAeeadhJmGIJr9lTtYm",
);
export const STRIPE_DEFAULT_OVERAGE_PRICE_ID = "price_1T2quyAeeadhJmGIZ1FOG2oB";
export const STRIPE_DEFAULT_OVERAGE_SOURCE = "billing_card";
export const STRIPE_OVERAGE_UNIT_AMOUNT_CENTS = 1000;
export const STRIPE_OVERAGE_CREDITS_PER_PACK = 150;

const subscriptionPriceToPlanEntries = new Map<string, CreditTier>([
  [STRIPE_DEFAULT_PRO_PRICE_ID, "pro"],
  [STRIPE_DEFAULT_TRADER_PRICE_ID, "trader"],
  [STRIPE_DEFAULT_ULTRA_PRICE_ID, "ultra"],
  [STRIPE_DEFAULT_ENTERPRISE_PRICE_ID, "enterprise"],
  ...LEGACY_STRIPE_SUBSCRIPTION_PRICE_IDS.pro.map((priceId) => [priceId, "pro"] as const),
  ...LEGACY_STRIPE_SUBSCRIPTION_PRICE_IDS.trader.map((priceId) => [priceId, "trader"] as const),
  ...LEGACY_STRIPE_SUBSCRIPTION_PRICE_IDS.ultra.map((priceId) => [priceId, "ultra"] as const),
  ...LEGACY_STRIPE_SUBSCRIPTION_PRICE_IDS.enterprise.map(
    (priceId) => [priceId, "enterprise"] as const,
  ),
]);

export const STRIPE_SUBSCRIPTION_PRICE_TO_PLAN: Record<string, CreditTier> =
  Object.fromEntries(subscriptionPriceToPlanEntries);

export const STRIPE_OVERAGE_PRICE_TO_CREDITS: Record<string, number> = {
  [STRIPE_DEFAULT_OVERAGE_PRICE_ID]: STRIPE_OVERAGE_CREDITS_PER_PACK,
};

export function getOverageCheckoutLabel(): string {
  const usd = (STRIPE_OVERAGE_UNIT_AMOUNT_CENTS / 100).toFixed(0);
  return `Get ${STRIPE_OVERAGE_CREDITS_PER_PACK.toLocaleString()} Extra Credits for $${usd}`;
}

export function getPlanForSubscriptionPrice(priceId: string): CreditTier | null {
  return STRIPE_SUBSCRIPTION_PRICE_TO_PLAN[priceId] ?? null;
}

export function isAllowedSubscriptionPriceId(priceId: string): boolean {
  return getPlanForSubscriptionPrice(priceId) !== null;
}

export function getOverageCreditsForPriceId(priceId: string): number | null {
  const credits = STRIPE_OVERAGE_PRICE_TO_CREDITS[priceId];
  if (typeof credits !== "number" || credits <= 0 || !Number.isFinite(credits)) {
    return null;
  }
  return credits;
}

export function isAllowedOveragePriceId(priceId: string): boolean {
  return getOverageCreditsForPriceId(priceId) !== null;
}
