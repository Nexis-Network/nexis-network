/**
 * Lightweight in-memory rate limiter for middleware (Edge-compatible).
 * Railway Redis is TCP-only, so middleware cannot reach it. This limiter
 * is best-effort and isolated per edge instance.
 *
 * Supports tier-aware limits via the TIER_LIMITS table. When a tier is
 * provided to checkRateLimit, the per-tier limit is used. Otherwise
 * falls back to the global NEX_RATE_LIMIT_MAX env var or 100.
 */

function parseWindowToMs(input?: string | null): number | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  const m = s.match(/^(\d+)\s*([smhd])$/);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2];
  if (!Number.isFinite(n) || n <= 0) return null;
  switch (unit) {
    case "s": return n * 1000;
    case "m": return n * 60 * 1000;
    case "h": return n * 60 * 60 * 1000;
    case "d": return n * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

const CONFIG_LIMIT = Number.parseInt(process.env.NEX_RATE_LIMIT_MAX ?? "", 10) || 100;
const CONFIG_WINDOW = (process.env.NEX_RATE_LIMIT_WINDOW ?? "1h").trim();
const FALLBACK_LIMIT = CONFIG_LIMIT;
const FALLBACK_WINDOW_MS = parseWindowToMs(CONFIG_WINDOW) ?? 60 * 60 * 1000;
const buckets = new Map<string, { count: number; reset: number }>();

/**
 * Tier-aware rate limits for the edge limiter.
 * Mirrors CHAT_RATE_LIMITS from billing-limits.ts but inlined to stay
 * Edge-compatible (no importing heavy server modules).
 */
const TIER_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  free:       { maxRequests: 10,  windowMs: 5 * 60 * 1000 },
  pro:        { maxRequests: 30,  windowMs: 5 * 60 * 1000 },
  trader:     { maxRequests: 50,  windowMs: 5 * 60 * 1000 },
  ultra:      { maxRequests: 100, windowMs: 5 * 60 * 1000 },
  enterprise: { maxRequests: 200, windowMs: 5 * 60 * 1000 },
};

export function isRateLimitRedisConfigured(): boolean {
  // Edge limiter never uses Redis
  return false;
}

/**
 * Check rate limit for an identifier, optionally applying tier-aware limits.
 * When tier is provided and recognized, uses the per-tier budget.
 * Falls back to the global limit (env var NEX_RATE_LIMIT_MAX or 100).
 */
export async function checkRateLimit(identifier: string, tier?: string | null) {
  const tierConfig = tier ? TIER_LIMITS[tier] : null;
  const limit = tierConfig?.maxRequests ?? FALLBACK_LIMIT;
  const windowMs = tierConfig?.windowMs ?? FALLBACK_WINDOW_MS;

  const now = Date.now();
  const bucket = buckets.get(identifier);

  if (!bucket || bucket.reset <= now) {
    buckets.set(identifier, { count: 1, reset: now + windowMs });
    return buildResult(true, limit, now + windowMs, limit - 1);
  }

  const count = bucket.count + 1;
  const success = count <= limit;
  bucket.count = count;
  buckets.set(identifier, bucket);
  const remaining = Math.max(limit - count, 0);
  return buildResult(success, limit, bucket.reset, remaining);
}

function buildResult(success: boolean, limit: number, reset: number, remaining: number) {
  return {
    success,
    limit,
    reset,
    remaining,
    headers: {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": reset.toString(),
    },
  };
}
