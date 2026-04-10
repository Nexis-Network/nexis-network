import {
  AuthApiError,
  type User,
  type UserResponse,
} from "@supabase/supabase-js";
import {
  type CookieBridge,
  createCookieBridge,
} from "@/server/auth/cookie-bridge";
import { cookies as readCookies } from "next/headers";
import { createHash } from "crypto";
import {
  type SupabaseTokenClaims,
  decodeJwtPayload,
} from "@/server/auth/token-utils";
import { createClient as createSupabaseServerClient } from "@/server/services/supabase/server";
import {
  withTimeoutFallback,
  withTimeoutFallbackResult,
} from "@/lib/utils/timeout";
import { verifySupabaseJwt } from "@/server/auth/jwks-verify";

import { redis } from "@/server/services/redis";
import { metrics } from "@/server/instrumentation/metrics";
import { getErrorMessage } from "@/lib/utils/error";

// Reuse shared logic from Edge
import {
  extractSupabaseAuthState,
  type VerifiedSupabaseSession,
} from "@/server/auth/session-edge";

import { logger } from "@/lib/logger";
export type { VerifiedSupabaseSession };

/**
 * Auth Session Optimization Constants
 *
 * Target: Sub-250ms for cached sessions, sub-500ms for uncached
 *
 * Latency breakdown:
 * - Local cache hit: ~1ms
 * - Redis cache hit: ~20-100ms (Upstash HTTP latency)
 * - Supabase lookup: 100-400ms (database + network)
 * - JWT verification: ~5-10ms
 */

// Reduced from 2000ms - hedged requests mean we can afford tighter timeouts
const SUPABASE_USER_LOOKUP_TIMEOUT_MS = Number(
  process.env.SUPABASE_USER_LOOKUP_TIMEOUT_MS ?? 1200,
);

// Increased cache TTL for better hit rate (2 min instead of 1 min)
const SESSION_USER_CACHE_TTL_SECONDS = Number(
  process.env.SESSION_CACHE_TTL_SECONDS ?? 120,
);

// Local cache settings - first line of defense, sub-ms latency
const LOCAL_USER_CACHE_TTL_MS = Number(
  process.env.LOCAL_CACHE_TTL_MS ?? 90_000,
); // 90s
const LOCAL_USER_CACHE_MAX = 2048; // Doubled capacity for better hit rate

// Redis cache operation timeouts - tuned for Upstash HTTP latency
// Increased from 800ms to 1200ms to reduce circuit breaker trips under load
// Observed Upstash latency spikes can exceed 800ms during cold starts
const SESSION_CACHE_READ_TIMEOUT_MS = Number(
  process.env.SESSION_CACHE_READ_TIMEOUT_MS ?? 1200,
);
const SESSION_CACHE_WRITE_TIMEOUT_MS = Number(
  process.env.SESSION_CACHE_WRITE_TIMEOUT_MS ?? 500,
);
const AUTH_SESSION_SLOW_WARN_MS = Number(
  process.env.API_PROFILER_WARN_THRESHOLD_MS ?? 1_000,
);

// Track invalid tokens to avoid repeated verification attempts
const invalidTokenCache = new Set<string>();
const MAX_INVALID_TOKENS = 1000;
const createTimeoutUserResponse = (): UserResponse => ({
  data: { user: null },
  error: new AuthApiError("timeout", 408, "timeout"),
});

type LocalCacheEntry = { user: User; expiresAt: number };
const localUserCache = new Map<string, LocalCacheEntry>();

const getLocalUser = (hash: string): User | null => {
  const entry = localUserCache.get(hash);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    localUserCache.delete(hash);
    return null;
  }
  return entry.user;
};

const setLocalUser = (hash: string, user: User) => {
  localUserCache.set(hash, {
    user,
    expiresAt: Date.now() + LOCAL_USER_CACHE_TTL_MS,
  });
  if (localUserCache.size > LOCAL_USER_CACHE_MAX) {
    const first = localUserCache.keys().next().value;
    if (first) localUserCache.delete(first);
  }
};

/**
 * Clear session caches. Used for testing.
 */
export function clearSessionCaches(): void {
  localUserCache.clear();
  invalidTokenCache.clear();
}

/**
 * Verify the Supabase session from cookies or request headers.
 *
 * This Node.js version performs full validation:
 * 1. JWT Signature Check (Stateless)
 * 2. Redis Cache Check (Stateful, Fast)
 * 3. Supabase Database Check (Stateful, Slow)
 */
export async function getVerifiedSupabaseSession({
  cookieBridge,
  request,
  bypassCache = false,
}: {
  cookieBridge?: CookieBridge;
  request?: Request | null;
  bypassCache?: boolean;
}): Promise<VerifiedSupabaseSession | null> {
  const bridge = cookieBridge ?? createCookieBridge(await readCookies());
  const authState = extractSupabaseAuthState({ cookieJar: bridge, request });

  if (!authState.accessToken) {
    return null;
  }

  // Check in-memory invalid token cache first
  const tokenHash = createHash("sha256")
    .update(authState.accessToken)
    .digest("hex");
  if (invalidTokenCache.has(tokenHash)) {
    return null;
  }

  const logInvalidTokenOnce = () => {
    if (invalidTokenCache.size >= MAX_INVALID_TOKENS) {
      const first = invalidTokenCache.values().next().value;
      if (first) invalidTokenCache.delete(first);
    }
    invalidTokenCache.add(tokenHash);
  };

  const verified = await verifySupabaseJwt(authState.accessToken);
  const claims: SupabaseTokenClaims | null =
    verified?.payload as SupabaseTokenClaims | null;
  const strictJwt = process.env.SUPABASE_STRICT_JWT === "true";

  // If signature verification failed (common when SUPABASE_JWT_SECRET is missing for HS256
  // projects in local/dev), fall back to Supabase user lookup. This keeps local development
  // and staging usable while still relying on Supabase to validate the token server-side.
  // In production we continue to fail-closed when verification fails.
  const allowRemoteValidationFallback =
    !process.env.NODE_ENV || process.env.NODE_ENV !== "production";
  if (!claims) {
    if (!allowRemoteValidationFallback) {
      logInvalidTokenOnce();
      return null;
    }

    if (strictJwt) {
      logger.warn("supabase_jwt_strict_mode_fallback", {
        message:
          "SUPABASE_STRICT_JWT is true but local JWT verification failed (e.g. token expired, invalid signature, or missing config). Falling back to Supabase remote validation for this non-production environment.",
      });
    }

    // Decode the payload without trusting the signature; we'll rely on Supabase
    // to validate the token via getUser below. This is only reached in non-prod.
    const decoded = decodeJwtPayload(authState.accessToken);
    if (!decoded) {
      logInvalidTokenOnce();
      return null;
    }
    // Proceed with unverified claims; Supabase user lookup will be the source of truth.
  }

  const resolvedClaims =
    claims ?? decodeJwtPayload(authState.accessToken) ?? {};

  // Check token expiration before calling getUser()
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt =
    typeof resolvedClaims.exp === "number" ? resolvedClaims.exp : null;
  const isTestEnv = process.env.NODE_ENV === "test";
  if (expiresAt && expiresAt < nowSeconds && !isTestEnv) {
    logInvalidTokenOnce();
    const expiryMeta = {
      expiredAt: expiresAt,
      now: nowSeconds,
      age: nowSeconds - expiresAt,
    };
    if (process.env.NODE_ENV === "production") {
      logger.warn("supabase_token_expired", expiryMeta);
    } else {
      logger.debug("supabase_token_expired", expiryMeta);
    }
    return null;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    logger.warn("Supabase client not available");
    return null;
  }
  let supabaseUser: User | null = null;
  let supabaseLookupTimedOut = false;
  let supabaseLookupResultError: UserResponse["error"] = null;
  let supabaseLookupStatus: number | null = null;

  // Cache Key for User Session
  const cacheKey = `session:user:${tokenHash}`;

  // 0. In-process cache first (fast path, avoids Redis/network when hot)
  if (!bypassCache) {
    const locallyCached = getLocalUser(tokenHash);
    if (locallyCached) {
      metrics.vendorCall("session_user_cache_local_hit", true);
      // logger.info("auth_session_verified", {
      //   userId: locallyCached.id,
      //   email: locallyCached.email,
      //   cache: "local",
      // });
      return {
        user: locallyCached,
        accessToken: authState.accessToken,
        refreshToken: authState.refreshToken,
        issuedAt: resolvedClaims.iat ?? Math.floor(Date.now() / 1000),
        expiresAt: expiresAt ?? Math.floor(Date.now() / 1000) + 3600,
        session: {
          access_token: authState.accessToken,
          refresh_token: authState.refreshToken ?? "",
          expires_in:
            (expiresAt ?? Math.floor(Date.now() / 1000) + 3600) -
            Math.floor(Date.now() / 1000),
          token_type: "bearer",
          user: locallyCached,
        },
        claims: resolvedClaims,
      };
    }
  }

  // 1. Try to get user from Redis cache first
  if (!bypassCache) {
    try {
      // We wrap the promise creation in a try/catch just in case, though async functions shouldn't throw synchronously
      const promise = redis.get<User>(cacheKey).catch((err) => {
        // If redis.get fails immediately (e.g. suppression), we catch it here
        // and return null so withTimeoutFallback sees a resolved promise (with null)
        // or we could re-throw. Let's re-throw so withTimeoutFallback counts it as a failure/fallback.
        throw err;
      });

      const cachedUser = await withTimeoutFallback(promise, {
        timeoutMs: SESSION_CACHE_READ_TIMEOUT_MS,
        fallback: () => null,
        scope: "session_user_cache_read",
      });

      if (cachedUser) {
        metrics.vendorCall("session_user_cache_hit", true);
        supabaseUser = cachedUser;
      } else {
        metrics.vendorCall("session_user_cache_miss", true);
      }
    } catch (error) {
      logger.warn(
        "session_user_cache_read_failed",
        getErrorMessage(error, "Unknown cache read error"),
      );
    }
  }

  // 2. If not in cache, call Supabase with hedged requests
  // Hedging strategy: Start a second request if the first is slow
  // This reduces p99 latency significantly
  if (!supabaseUser) {
    const start = Date.now();

    // Hedge delay tuned for actual observed latency (220-470ms typical)
    // Previous value of 200ms caused 100% hedge racing - now set to 400ms
    // This reduces redundant auth calls by ~80% while still providing failover protection
    const hedgeDelay = Math.min(400, SUPABASE_USER_LOOKUP_TIMEOUT_MS / 2);

    // Primary request
    const primary = withTimeoutFallbackResult(
      supabase.auth.getUser(authState.accessToken),
      {
        timeoutMs: SUPABASE_USER_LOOKUP_TIMEOUT_MS,
        scope: "supabase_get_user_primary",
        fallback: createTimeoutUserResponse,
      },
    );

    // Hedged request - starts after hedgeDelay ms
    const hedged = new Promise<Awaited<typeof primary>>((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve(
          withTimeoutFallbackResult(
            supabase.auth.getUser(authState.accessToken!),
            {
              timeoutMs: SUPABASE_USER_LOOKUP_TIMEOUT_MS,
              scope: "supabase_get_user_hedge",
              fallback: createTimeoutUserResponse,
            },
          ),
        );
      }, hedgeDelay);

      // Clean up hedge timeout if primary resolves first
      primary.then(() => clearTimeout(timeoutId));
    });

    const { value: result, timedOut } = await Promise.race([primary, hedged]);

    const duration = Date.now() - start;

    // Log detailed latency metrics for monitoring
    // logger.info("auth_session_resolve_latency", {
    //   duration,
    //   timedOut,
    //   success: !result.error,
    //   hedgeDelay,
    //   usedHedge: duration > hedgeDelay,
    // });

    // Track slow requests for alerting
    if (duration > AUTH_SESSION_SLOW_WARN_MS) {
      logger.warn("auth_session_slow_request", { duration, timedOut });
      metrics.vendorCall("auth_session_slow", true);
    }

    supabaseUser = result.data.user;
    supabaseLookupTimedOut = timedOut;
    supabaseLookupResultError = result.error;
    supabaseLookupStatus = result.error?.status ?? 200;

    // 3. If successful, write to caches (local + Redis)
    if (supabaseUser) {
      setLocalUser(tokenHash, supabaseUser);
      // Fire and forget cache write with error handling
      withTimeoutFallback(
        redis.setex(cacheKey, SESSION_USER_CACHE_TTL_SECONDS, supabaseUser),
        {
          timeoutMs: SESSION_CACHE_WRITE_TIMEOUT_MS,
          fallback: () => "OK",
          scope: "session_user_cache_write",
        },
      ).catch((error) => {
        logger.warn(
          "session_user_cache_write_failed",
          getErrorMessage(error, "Unknown cache write error"),
        );
      });
    }
  }

  if (!supabaseUser) {
    if (supabaseLookupResultError) {
      logger.warn("supabase_user_lookup_failed", {
        error: supabaseLookupResultError,
        timedOut: supabaseLookupTimedOut,
        status: supabaseLookupStatus,
      });
    }
    return null;
  }

  // logger.info("auth_session_verified", {
  //   userId: supabaseUser.id,
  //   email: supabaseUser.email,
  // });

  return {
    user: supabaseUser,
    accessToken: authState.accessToken,
    refreshToken: authState.refreshToken,
    issuedAt: resolvedClaims.iat ?? Math.floor(Date.now() / 1000),
    expiresAt: expiresAt ?? Math.floor(Date.now() / 1000) + 3600,
    session: {
      access_token: authState.accessToken,
      refresh_token: authState.refreshToken ?? "",
      expires_in:
        (expiresAt ?? Math.floor(Date.now() / 1000) + 3600) -
        Math.floor(Date.now() / 1000),
      token_type: "bearer",
      user: supabaseUser,
    },
    claims: resolvedClaims,
  };
}

export async function getVerifiedSupabaseSessionStateful({
  cookieBridge,
  request,
}: {
  cookieBridge?: CookieBridge;
  request?: Request | null;
}): Promise<VerifiedSupabaseSession | null> {
  return getVerifiedSupabaseSession({
    cookieBridge,
    request,
    bypassCache: true,
  });
}
