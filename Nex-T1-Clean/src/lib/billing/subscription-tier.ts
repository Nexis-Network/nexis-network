export type SupportedSubscriptionTier =
  | "free"
  | "pro"
  | "trader"
  | "ultra"
  | "enterprise";

const FREE_BADGE_CLASSES = "bg-secondary text-muted-foreground border-transparent";

const SUBSCRIPTION_TIER_BADGE_CLASSES: Record<SupportedSubscriptionTier, string> = {
  free: FREE_BADGE_CLASSES,
  pro: "bg-sky-400/8 border-sky-400/12 text-sky-400",
  trader: "bg-emerald-500/8 border-emerald-500/12 text-emerald-500",
  ultra: "bg-blue-600/8 border-blue-600/12 text-blue-600",
  enterprise: "bg-orange-600/8 border-orange-600/12 text-orange-600",
};

const SUBSCRIPTION_TIER_LABELS: Record<SupportedSubscriptionTier, string> = {
  free: "Free",
  pro: "Pro",
  trader: "Trader",
  ultra: "Ultra",
  enterprise: "Enterprise",
};

export function normalizeSubscriptionTier(value: string | null | undefined): SupportedSubscriptionTier {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "pro") {
    return "pro";
  }
  if (normalized === "trader") {
    return "trader";
  }
  if (normalized === "ultra") {
    return "ultra";
  }
  if (normalized === "enterprise") {
    return "enterprise";
  }
  return "free";
}

export function getSubscriptionTierLabel(value: string | null | undefined): string {
  return SUBSCRIPTION_TIER_LABELS[normalizeSubscriptionTier(value)];
}

export function getSubscriptionTierBadgeClasses(value: string | null | undefined): string {
  return SUBSCRIPTION_TIER_BADGE_CLASSES[normalizeSubscriptionTier(value)];
}
