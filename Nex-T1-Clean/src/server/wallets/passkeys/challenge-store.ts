// Domain: wallets (Safe)
// Responsibility: Store short-lived WebAuthn challenges for wallet passkey flows.
// Depends on: Redis (optional), JWT fallback.
// Notes:
// - We need a server-side authoritative challenge to prevent replay.
// - JWT fallback now includes JTI-based replay protection to ensure single-use.

import { randomUUID } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";

import { redis, isRedisConfigured } from "@/server/services/redis";

const CHALLENGE_TTL_SECONDS = Number(process.env.WALLET_PASSKEY_CHALLENGE_TTL_SECONDS ?? 180);

/**
 * In-memory consumed JTI set for JWT fallback mode (when Redis is unavailable).
 * Each entry stores the JTI string and its expiration timestamp so we can
 * garbage-collect expired entries and avoid unbounded memory growth.
 *
 * SECURITY: This prevents challenge replay attacks in JWT-mode by tracking
 * consumed challenge tokens. Note that this is process-local and will reset
 * on server restart. For multi-instance deployments, Redis mode should be used.
 */
const consumedJtis = new Map<string, number>();

/** Purge expired JTIs from the in-memory set. Runs lazily on each consume call. */
function purgeExpiredJtis(): void {
  const now = Math.floor(Date.now() / 1000);
  for (const [jti, expiresAt] of consumedJtis) {
    if (expiresAt <= now) {
      consumedJtis.delete(jti);
    }
  }
}

function getJwtSecret(): Uint8Array {
  const raw = process.env.WALLET_PASSKEY_CHALLENGE_JWT_SECRET?.trim();
  if (!raw) {
    // Reuse the general app secret if available; otherwise require explicit secret.
    const fallback = process.env.JWT_SECRET?.trim();
    if (!fallback) {
      throw new Error("Missing WALLET_PASSKEY_CHALLENGE_JWT_SECRET (or JWT_SECRET fallback)");
    }
    return new TextEncoder().encode(fallback);
  }
  return new TextEncoder().encode(raw);
}

export type StoredChallenge = {
  challenge: string;
  userId: string | null;
  purpose: "register" | "auth" | "login" | "step_up";
  issuedAt: number;
  scope?: {
    action: "wallets:send";
    payloadHash: string;
  };
};

function buildRedisChallengeKey(token: string): string {
  return `wallet_passkeys:challenge:${token}`;
}

export async function issueChallenge(params: {
  userId: string | null;
  purpose: StoredChallenge["purpose"];
  challenge: string;
  scope?: StoredChallenge["scope"];
}) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const tokenId = randomUUID();
  const payload: StoredChallenge = {
    userId: params.userId,
    purpose: params.purpose,
    challenge: params.challenge,
    issuedAt,
    ...(params.scope ? { scope: params.scope } : {}),
  };

  if (isRedisConfigured) {
    const key = buildRedisChallengeKey(tokenId);
    await redis.set(key, payload, { ex: CHALLENGE_TTL_SECONDS });
    return { token: tokenId };
  }

  // SECURITY: Include a unique JTI (JWT ID) to enable single-use enforcement.
  // The JTI is tracked on consumption to prevent replay attacks.
  const token = await new SignJWT({ ...payload, jti: tokenId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + CHALLENGE_TTL_SECONDS)
    .setJti(tokenId)
    .sign(getJwtSecret());

  return { token };
}

export async function consumeChallenge(params: {
  userId?: string | null;
  purpose: StoredChallenge["purpose"];
  token?: string | null;
}) {
  const token = params.token?.trim();

  if (isRedisConfigured) {
    if (!token) return null;

    const key = buildRedisChallengeKey(token);
    const stored = await redis.get<StoredChallenge>(key);
    if (!stored) return null;
    await redis.del(key);
    if (stored.purpose !== params.purpose) return null;
    if (typeof params.userId === "string" && stored.userId !== params.userId) {
      return null;
    }
    return stored;
  }

  if (!token) return null;

  let payload;
  try {
    const result = await jwtVerify(token, getJwtSecret());
    payload = result.payload;
  } catch {
    return null;
  }

  const userId =
    typeof payload.userId === "string"
      ? payload.userId
      : payload.userId === null
        ? null
        : null;
  const purpose =
    payload.purpose === "register" ||
    payload.purpose === "auth" ||
    payload.purpose === "login" ||
    payload.purpose === "step_up"
      ? payload.purpose
      : null;
  const challenge = typeof payload.challenge === "string" ? payload.challenge : null;
  const rawScope =
    payload.scope && typeof payload.scope === "object"
      ? (payload.scope as Record<string, unknown>)
      : null;
  const scope =
    rawScope &&
    rawScope.action === "wallets:send" &&
    typeof rawScope.payloadHash === "string"
      ? {
          action: "wallets:send" as const,
          payloadHash: rawScope.payloadHash,
        }
      : undefined;
  const jti = typeof payload.jti === "string" ? payload.jti : null;
  if (!purpose || !challenge) return null;
  if (purpose !== params.purpose) return null;
  if (typeof params.userId === "string" && userId !== params.userId) return null;

  // SECURITY: Enforce single-use by checking if this JTI has already been consumed.
  // This prevents challenge replay attacks where a valid JWT is resubmitted.
  if (jti) {
    // Lazy garbage collection of expired JTIs
    purgeExpiredJtis();

    if (consumedJtis.has(jti)) {
      // This challenge token has already been used - reject replay attempt
      return null;
    }

    // Mark as consumed. Store with expiration time for future cleanup.
    const expiresAt = typeof payload.exp === "number" ? payload.exp : Math.floor(Date.now() / 1000) + CHALLENGE_TTL_SECONDS;
    consumedJtis.set(jti, expiresAt);
  }

  return {
    userId,
    purpose,
    challenge,
    issuedAt: typeof payload.iat === "number" ? payload.iat : Math.floor(Date.now() / 1000),
    ...(scope ? { scope } : {}),
  } satisfies StoredChallenge;
}
