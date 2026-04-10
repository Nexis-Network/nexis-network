import crypto from "crypto";

const API_KEY_PREFIX = "nex_";
const API_KEY_PEPPER = process.env.API_KEY_PEPPER ?? "";

export type ApiAccessTier = "free" | "pro" | "ultra" | "enterprise";

export type ApiKeyRecord = {
  id: string;
  name: string | null;
  start: string;
  prefix?: string | null;
  owner_type?: "user" | "organization" | null;
  owner_id?: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  metadata: Record<string, UntypedJson> | null;
  revoked_at: string | null;
  tier?: ApiAccessTier | string | null;
  rate_limit_requests?: number | null;
  rate_limit_window_seconds?: number | null;
  daily_quota?: number | null;
  monthly_quota?: number | null;
  project_id?: string | null;
  last_used_at?: string | null;
  allowed_products?: string[] | null;
};

export type ApiKeyResponsePayload = {
  id: string;
  name?: string | null;
  start: string;
  prefix?: string | null;
  ownerType?: "user" | "organization";
  ownerId?: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  metadata?: Record<string, UntypedJson> | null;
  revokedAt?: string | null;
  tier?: ApiAccessTier | string | null;
  rateLimit?: { requestsPerMinute: number | null; windowSeconds: number | null };
  quotas?: { daily?: number | null; monthly?: number | null };
  projectId?: string | null;
  lastUsedAt?: string | null;
  allowedProducts?: string[] | null;
};

export function generateApiKeySecret(): string {
  const raw = crypto.randomBytes(32).toString("base64url");
  return `${API_KEY_PREFIX}${raw}`;
}

/**
 * Hash an API key secret for storage using SHA-256 + application pepper.
 *
 * SECURITY NOTE: The Supabase migration comment (20251119120000) incorrectly states
 * "Argon2id hash" for the hashed_secret column. The actual implementation uses SHA-256
 * with an application-level pepper (API_KEY_PEPPER env var). This is acceptable because:
 *
 * 1. API keys are generated via crypto.randomBytes(32) - 256 bits of entropy.
 *    Unlike passwords, they are not vulnerable to dictionary or brute-force attacks.
 * 2. SHA-256 + pepper is the industry standard for high-entropy API key hashing
 *    (used by Stripe, GitHub, AWS, etc.).
 * 3. Argon2id is designed for low-entropy inputs (passwords) where brute-force is a
 *    threat; it adds unnecessary latency for API key verification on every request.
 *
 * If API key entropy requirements change, upgrade to HMAC-SHA-256 with a proper secret.
 */
export function hashApiKeySecret(secret: string): string {
  return crypto.createHash("sha256").update(`${secret}${API_KEY_PEPPER}`).digest("hex");
}

export function mapApiKeyRecord(record: ApiKeyRecord): ApiKeyResponsePayload {
  const rateLimitRequests = record.rate_limit_requests ?? null;
  const rateLimitWindowSeconds = record.rate_limit_window_seconds ?? null;
  const dailyQuota = record.daily_quota ?? null;
  const monthlyQuota = record.monthly_quota ?? null;

  return {
    id: record.id,
    name: record.name,
    start: record.start,
    prefix: record.prefix ?? undefined,
    ownerType: record.owner_type ?? undefined,
    ownerId: record.owner_id ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    expiresAt: record.expires_at,
    metadata: record.metadata,
    revokedAt: record.revoked_at,
    tier: (record.tier as ApiAccessTier | string | null) ?? (record.metadata)?.tier ?? null,
    rateLimit: {
      requestsPerMinute: rateLimitRequests,
      windowSeconds: rateLimitWindowSeconds,
    },
    quotas: {
      daily: dailyQuota,
      monthly: monthlyQuota,
    },
    projectId: record.project_id ?? null,
    lastUsedAt: record.last_used_at ?? null,
    allowedProducts: record.allowed_products ?? null,
  };
}
