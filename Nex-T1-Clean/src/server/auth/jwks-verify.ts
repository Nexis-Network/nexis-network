import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

import { getSupabaseConfig } from "@/lib/supabase/config";


import { logger } from '@/lib/logger';
type VerifyResult = {
  payload: JWTPayload;
};

let cachedJwksUrl: string | null = null;
let cachedRemoteJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let lastJwksErrorAt = 0;

type JwtHeader = {
  alg?: string;
  kid?: string;
};

const decodeUnverifiedHeader = (token: string): JwtHeader | null => {
  const [headerPart] = token.split(".");
  if (!headerPart) return null;
  try {
    const json = Buffer.from(headerPart, "base64url").toString("utf8");
    return JSON.parse(json) as JwtHeader;
  } catch {
    return null;
  }
};

const decodeUnverifiedPayload = (token: string): JWTPayload | null => {
  const [, payloadPart] = token.split(".");
  if (!payloadPart) return null;
  try {
    const json = Buffer.from(payloadPart, "base64url").toString("utf8");
    return JSON.parse(json) as JWTPayload;
  } catch {
    return null;
  }
};

/**
 * Supabase recently moved the public JWKS to `.well-known/jwks.json`.
 * Older configs (including ours) pointed at `/auth/v1/certs` or `/auth/v1/keys`,
 * which now return 401/404. Normalize those legacy paths so verification works
 * even if env vars haven't been updated yet.
 */
function normalizeSupabaseJwksUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    const path = url.pathname.replace(/\/+$/, "");

    // Supabase custom domains do not end with `.supabase.co`, but they still
    // serve the same JWKS path. Normalize legacy paths for any host.
    if (["/auth/v1/certs", "/auth/v1/keys", "/auth/v1/jwks"].includes(path)) {
      url.pathname = "/auth/v1/.well-known/jwks.json";
      return url.toString();
    }
    return url.toString();
  } catch {
    return urlString;
  }
}

function resolveJwksUrl(): string | null {
  if (cachedJwksUrl) return cachedJwksUrl;

  const explicit = process.env.SUPABASE_JWKS_URL ?? process.env.NEXT_PUBLIC_SUPABASE_JWKS_URL;
  if (explicit) {
    cachedJwksUrl = normalizeSupabaseJwksUrl(explicit);
    return cachedJwksUrl;
  }

  const config = getSupabaseConfig();
  if (!config?.url) return null;
  try {
    const url = new URL(config.url);
    url.pathname = "/auth/v1/.well-known/jwks.json";
    cachedJwksUrl = normalizeSupabaseJwksUrl(url.toString());
    return cachedJwksUrl;
  } catch {
    return null;
  }
}

function getRemoteJwks(): ReturnType<typeof createRemoteJWKSet> | null {
  if (cachedRemoteJwks) return cachedRemoteJwks;
  const jwksUrl = resolveJwksUrl();
  if (!jwksUrl) return null;
  const remote = createRemoteJWKSet(new URL(jwksUrl), {
    // Avoid long stalls when JWKS endpoint is unreachable/misconfigured
    timeoutDuration: 2_000,
    cooldownDuration: 60_000,
  });
  cachedRemoteJwks = remote;
  return remote;
}

function getHmacJwtSecret(): string | null {
  const candidate =
    process.env.SUPABASE_JWT_SECRET ??
    process.env.NEXT_PUBLIC_SUPABASE_JWT_SECRET ??
    process.env.JWT_SECRET ??
    null;

  if (!candidate) return null;

  // If someone accidentally points JWT_SECRET at a JWKS url, skip HMAC verification
  // to avoid treating a URL as an HMAC secret.
  if (/^https?:\/\//i.test(candidate)) {
    return null;
  }

  return candidate.trim();
}

function isJwtExpiredError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const details = error as {
    code?: unknown;
    name?: unknown;
    message?: unknown;
  };

  if (details.code === "ERR_JWT_EXPIRED" || details.name === "JWTExpired") {
    return true;
  }

  if (typeof details.message !== "string") {
    return false;
  }

  const message = details.message.toLowerCase();
  return (
    message.includes("jwt expired") ||
    message.includes("\"exp\" claim timestamp check failed") ||
    message.includes("exp claim timestamp check failed")
  );
}

/**
 * Verify a Supabase JWT using JWKS.
 * 
 * Security: In production, we ALWAYS fail closed if verification fails.
 * No escape hatches. No unverified token fallbacks.
 * 
 * In test/development mode, we allow unverified tokens for local testing.
 */
export async function verifySupabaseJwt(token: string): Promise<VerifyResult | null> {
  const isTestEnv = process.env.NODE_ENV === "test";
  const isDevEnv = process.env.NODE_ENV === "development";
  const isProduction = process.env.NODE_ENV === "production";

  const header = decodeUnverifiedHeader(token);
  const alg = typeof header?.alg === "string" ? header.alg : null;
  const isHmacAlg = alg?.startsWith("HS") ?? false;

  // Legacy/self-hosted Supabase projects may still sign sessions with HS256.
  // When that happens, JWKS verification will always fail because symmetric
  // keys cannot be represented in the remote JWK set. Try HMAC verification
  // first if we have the secret.
  if (isHmacAlg) {
    const hmacSecret = getHmacJwtSecret();
    if (hmacSecret) {
      try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(hmacSecret), {
          algorithms: [alg as string],
          clockTolerance: 5,
        });
        return { payload };
      } catch (error) {
        const message = (error as Error)?.message ?? String(error);
        const isExpiredError = isJwtExpiredError(error);
        if (isProduction) {
          if (!isExpiredError) {
            const now = Date.now();
            if (now - lastJwksErrorAt > 60_000) {
              lastJwksErrorAt = now;
              logger.error("JWT verification failed (HS fallback):", message);
            }
          }
          return null;
        }

        // Dev/test fallback mirrors JWKS path below
        if ((isDevEnv && process.env.SUPABASE_STRICT_JWT !== "true") || isTestEnv) {
          const payload = decodeUnverifiedPayload(token);
          if (payload) {
            if (isDevEnv && !isExpiredError) {
              const now = Date.now();
              if (now - lastJwksErrorAt > 60_000) {
                lastJwksErrorAt = now;
                logger.warn(
                  "⚠️  JWT verification failed (HS fallback), using unverified payload (dev mode only):",
                  message,
                );
              }
            }
            return { payload };
          }
        }
        return null;
      }
    }
    // No secret configured; fall back to dev/test unverified payload so local
    // development keeps working without noisy errors.
    if ((isDevEnv && process.env.SUPABASE_STRICT_JWT !== "true") || isTestEnv) {
      const payload = decodeUnverifiedPayload(token);
      if (payload) {
        return { payload };
      }
    }
    // In production or when strict, fail closed.
    if (isProduction) {
      const now = Date.now();
      if (now - lastJwksErrorAt > 60_000) {
        lastJwksErrorAt = now;
        logger.error(
          "JWT verification failed (HS alg) because SUPABASE_JWT_SECRET is not configured. Tokens will be rejected.",
        );
      }
    }
    return null;
  }

  const jwks = getRemoteJwks();

  // In test mode without JWKS, allow unverified tokens for unit tests
  if (!jwks && isTestEnv) {
    const payload = decodeUnverifiedPayload(token);
    return payload ? { payload } : null;
  }

  // In production without JWKS configured, fail closed
  if (!jwks) {
    if (isProduction) {
      logger.error("CRITICAL: JWKS not configured in production. All tokens will be rejected.");
    }
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      clockTolerance: 5, // seconds of leeway
    });
    return { payload };
  } catch (error) {
    const message = (error as Error)?.message ?? String(error);
    const isExpiredError = isJwtExpiredError(error);

    // In test mode, fall back to unverified for convenience
    if (isTestEnv) {
      const payload = decodeUnverifiedPayload(token);
      if (payload) return { payload };
    }

    // In development, allow fallback but warn loudly
    // Enable strict mode via SUPABASE_STRICT_JWT=true to test production behavior
    if (isDevEnv && process.env.SUPABASE_STRICT_JWT !== "true") {
      const payload = decodeUnverifiedPayload(token);
      if (payload) {
        if (!isExpiredError) {
          const now = Date.now();
          if (now - lastJwksErrorAt > 60_000) {
            lastJwksErrorAt = now;
            logger.warn(
              "⚠️  JWT verification failed, using unverified fallback (dev mode only):",
              message,
              "\n   Set SUPABASE_STRICT_JWT=true to test production behavior."
            );
          }
        }
        return { payload };
      }
    }

    // In production: FAIL CLOSED. No exceptions. No escape hatches.
    if (isProduction) {
      if (!isExpiredError) {
        const now = Date.now();
        if (now - lastJwksErrorAt > 60_000) {
          lastJwksErrorAt = now;
          logger.error("JWT verification failed (production - fail closed):", message);
        }
      }
    }

    return null;
  }
}
