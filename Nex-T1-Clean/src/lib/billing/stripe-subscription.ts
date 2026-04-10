export type StripeSubscriptionPlan = {
  product: string;
  price: string;
  interval: string;
  status: string;
  renewsAt: string | null;
};

const DEFAULT_STRIPE_PLAN: StripeSubscriptionPlan = {
  product: "Free",
  price: "$0.00",
  interval: "month",
  status: "active",
  renewsAt: null,
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function extractStripeSubscriptionPlan(payload: unknown): StripeSubscriptionPlan | null {
  const raw = asRecord(payload);
  if (!raw) {
    return null;
  }

  const maybeWrapped = asRecord(raw.data);
  const source = maybeWrapped ?? raw;

  return {
    product: asNonEmptyString(source.product) ?? DEFAULT_STRIPE_PLAN.product,
    price: asNonEmptyString(source.price) ?? DEFAULT_STRIPE_PLAN.price,
    interval: asNonEmptyString(source.interval) ?? DEFAULT_STRIPE_PLAN.interval,
    status: asNonEmptyString(source.status) ?? DEFAULT_STRIPE_PLAN.status,
    renewsAt: asNonEmptyString(source.renewsAt),
  };
}

export function isFreeStripeSubscriptionPlan(plan: StripeSubscriptionPlan | null): boolean {
  if (!plan) {
    return true;
  }

  const normalizedProduct = typeof plan.product === "string" ? plan.product.trim().toLowerCase() : "";
  if (!normalizedProduct) {
    return true;
  }

  return normalizedProduct.includes("free");
}
