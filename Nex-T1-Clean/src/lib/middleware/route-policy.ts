/**
 * Route-level authentication and refresh policies.
 */
export type RoutePolicy = {
  prefix: string;
  requiresAuth: boolean;
  refresh: "always" | "lazy";
  assurance?: "standard" | "high";
  requiredRoles?: readonly string[];
};

/**
 * Protected routes that require authentication.
 */
export const ROUTE_POLICIES: RoutePolicy[] = [
  { prefix: "/app", requiresAuth: true, refresh: "always" },
  {
    prefix: "/admin",
    requiresAuth: true,
    refresh: "always",
    assurance: "high",
    requiredRoles: ["admin", "staff"],
  },
  { prefix: "/marketplace", requiresAuth: true, refresh: "always" },
  { prefix: "/analytics", requiresAuth: true, refresh: "always" },
  { prefix: "/leaderboard", requiresAuth: true, refresh: "always" },
  {
    prefix: "/protected",
    requiresAuth: true,
    refresh: "always",
    assurance: "high",
  },
  {
    prefix: "/settings",
    requiresAuth: true,
    refresh: "always",
    assurance: "high",
  },
  { prefix: "/success", requiresAuth: true, refresh: "always" },
  { prefix: "/voice-chat", requiresAuth: true, refresh: "always" },
  { prefix: "/onboarding", requiresAuth: true, refresh: "always" },
  { prefix: "/studio", requiresAuth: true, refresh: "always" },
];

/**
 * Default policy for routes not explicitly listed.
 */
export const DEFAULT_ROUTE_POLICY: RoutePolicy = {
  prefix: "*",
  requiresAuth: false,
  refresh: "lazy",
  assurance: "standard",
};

type PublicApiMatcher = {
  exact?: readonly string[];
  prefixes?: readonly string[];
};

/**
 * API routes that don't require authentication.
 *
 * Keep this list explicit so adding a new `/api/*` route does not silently
 * become public through a broad prefix match.
 */
export const PUBLIC_API_MATCHERS: PublicApiMatcher = {
  exact: [
    "/api/health",
    "/api/health/cache",
    "/api/health/moralis",
    "/api/health/redis",
    "/api/insights/asset",
    "/api/internal/insights/asset/generate",
    "/api/internal/insights/portfolio/generate",
    "/api/market/stream",
    "/api/prices/gas",
    "/api/auth/session",
    "/api/auth/providers",
    "/api/auth/google/token",
    "/api/auth/wallet/challenge",
    "/api/auth/wallet/verify",
    "/api/auth/oauth",
    "/api/auth/oauth/exchange",
    "/api/stripe/webhook",
    "/api/auth/cdp/.well-known/jwks.json",
    "/api/v1/leaderboard",
    "/api/internal/log-edge-session",
    "/api/webhooks/run-task",
    "/api/analytics/events",
  ] as const,
  prefixes: [
    "/api/auth/email/",
    "/api/auth/phone/",
    "/api/auth/oauth/",
    "/api/analytics/assets/",
    "/api/integrations/coingecko/",
  ] as const,
};

/**
 * Resolve the policy for a given pathname.
 */
export function getRoutePolicyForPath(pathname: string): RoutePolicy {
  return ROUTE_POLICIES.find((policy) => pathname.startsWith(policy.prefix)) ??
    DEFAULT_ROUTE_POLICY;
}

export function isHighAssuranceRoute(pathname: string): boolean {
  return getRoutePolicyForPath(pathname).assurance === "high";
}

/**
 * Check if a pathname requires authentication.
 */
export function requiresAuthentication(pathname: string): boolean {
  return getRoutePolicyForPath(pathname).requiresAuth;
}

/**
 * Check if a pathname is a public API endpoint.
 */
export function isPublicApiRoute(pathname: string): boolean {
  if (PUBLIC_API_MATCHERS.exact?.includes(pathname)) {
    return true;
  }
  return (PUBLIC_API_MATCHERS.prefixes ?? []).some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}
