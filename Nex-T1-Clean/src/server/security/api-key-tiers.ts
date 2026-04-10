import type { ApiAccessTier } from "@/server/security/api-key-utils";

export type ApiTierLimits = {
  tier: ApiAccessTier;
  rateLimitRequests: number;
  rateLimitWindowSeconds: number;
  dailyQuota: number | null;
  monthlyQuota: number | null;
};

const RANK: Record<ApiAccessTier, number> = {
  free: 0,
  pro: 1,
  ultra: 2,
  enterprise: 3,
};

const DEFAULT_LIMITS: Record<ApiAccessTier, Omit<ApiTierLimits, "tier">> = {
  free: {
    rateLimitRequests: 60,
    rateLimitWindowSeconds: 60,
    dailyQuota: 2_000,
    monthlyQuota: 50_000,
  },
  pro: {
    rateLimitRequests: 240,
    rateLimitWindowSeconds: 60,
    dailyQuota: 20_000,
    monthlyQuota: 600_000,
  },
  ultra: {
    rateLimitRequests: 600,
    rateLimitWindowSeconds: 60,
    dailyQuota: 100_000,
    monthlyQuota: 1_500_000,
  },
  enterprise: {
    rateLimitRequests: 1_200,
    rateLimitWindowSeconds: 60,
    dailyQuota: null, // treated as unlimited unless overridden
    monthlyQuota: null,
  },
};

function coerceTier(value: UntypedJson): ApiAccessTier | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "free" || normalized === "pro" || normalized === "ultra" || normalized === "enterprise") {
    return normalized;
  }
  return null;
}

function envNumber(name: string, fallback: number | null): number | null {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function applyEnvOverrides(tier: ApiAccessTier, base: Omit<ApiTierLimits, "tier">): Omit<ApiTierLimits, "tier"> {
  const envPrefix = `NEX_API_${tier.toUpperCase()}`;
  return {
    rateLimitRequests: envNumber(`${envPrefix}_RPM`, base.rateLimitRequests) ?? base.rateLimitRequests,
    rateLimitWindowSeconds: envNumber(`${envPrefix}_WINDOW_SECONDS`, base.rateLimitWindowSeconds) ?? base.rateLimitWindowSeconds,
    dailyQuota: envNumber(`${envPrefix}_DAILY`, base.dailyQuota ?? null),
    monthlyQuota: envNumber(`${envPrefix}_MONTHLY`, base.monthlyQuota ?? null),
  };
}

function highestTier(candidates: Array<ApiAccessTier | null | undefined>): ApiAccessTier | null {
  let best: ApiAccessTier | null = null;
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (!best || RANK[candidate] > RANK[best]) {
      best = candidate;
    }
  }
  return best;
}

function tierFromRoles(roles: readonly string[] | undefined): ApiAccessTier | null {
  if (!roles?.length) return null;
  const normalized = roles.map((role) => role?.toLowerCase?.() ?? "").filter(Boolean);
  if (normalized.includes("enterprise")) return "enterprise";
  if (normalized.includes("ultra")) return "ultra";
  if (normalized.includes("pro")) return "pro";
  if (normalized.includes("free")) return "free";
  return null;
}

function tierFromMetadata(meta: Record<string, UntypedJson> | null | undefined): ApiAccessTier | null {
  if (!meta || typeof meta !== "object") return null;
  const candidates: Array<UntypedJson> = [
    (meta as Record<string, UntypedJson>).tier,
    (meta as Record<string, UntypedJson>).plan,
    (meta as Record<string, UntypedJson>).plan_slug,
    (meta as Record<string, UntypedJson>).subscriptionTier,
    (meta as Record<string, UntypedJson>).subscription_tier,
  ];

  for (const value of candidates) {
    const tier = coerceTier(value);
    if (tier) return tier;
  }
  return null;
}

export function resolveApiAccessTier(options: {
  roles?: readonly string[];
  userMetadata?: Record<string, UntypedJson> | null;
  appMetadata?: Record<string, UntypedJson> | null;
  organizationMetadata?: Record<string, UntypedJson> | null;
  requestedTier?: string | null;
  defaultTier?: ApiAccessTier;
}): ApiAccessTier {
  const defaultTier: ApiAccessTier = options.defaultTier ?? "free";

  const roleTier = tierFromRoles(options.roles);
  const userTier = tierFromMetadata(options.userMetadata);
  const appTier = tierFromMetadata(options.appMetadata);
  const orgTier = tierFromMetadata(options.organizationMetadata);

  const entitlement = highestTier([roleTier, orgTier, userTier, appTier]) ?? defaultTier;
  const requested = coerceTier(options.requestedTier);

  if (requested && RANK[requested] <= RANK[entitlement]) {
    return requested;
  }

  return entitlement;
}

export function tierLimits(tier: ApiAccessTier): ApiTierLimits {
  const base = DEFAULT_LIMITS[tier];
  const withOverrides = applyEnvOverrides(tier, base);
  return {
    tier,
    rateLimitRequests: withOverrides.rateLimitRequests,
    rateLimitWindowSeconds: withOverrides.rateLimitWindowSeconds,
    dailyQuota: withOverrides.dailyQuota,
    monthlyQuota: withOverrides.monthlyQuota,
  };
}
