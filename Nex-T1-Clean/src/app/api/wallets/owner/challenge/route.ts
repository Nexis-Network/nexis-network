import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { redis, isRedisConfigured } from "@/server/services/redis";
import { SignJWT } from "jose";


const CHALLENGE_TTL_SECONDS = 300;

function resolveChallengeSecret(): Uint8Array | null {
  const secret =
    process.env.SUPABASE_JWT_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    "";
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function POST(request: Request) {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(cookieBridge, { request });

  if (!context?.userId) {
    return cookieBridge.commit(apiResponse.unauthorized());
  }

  const nonce = crypto.randomUUID();
  const message = `Nex-T1 wallet owner registration nonce: ${nonce}`;

  // Preferred: Redis-backed nonce
  if (isRedisConfigured) {
    const key = `wallet_owner_challenge:${context.userId}`;
    await redis.setex(key, CHALLENGE_TTL_SECONDS, nonce);
    return cookieBridge.commit(apiResponse.success({ nonce, message, expiresInSeconds: CHALLENGE_TTL_SECONDS }));
  }

  // Fallback: signed token (stateless) for environments without Redis.
  const secret = resolveChallengeSecret();
  if (!secret) {
    return cookieBridge.commit(apiResponse.serviceUnavailable("Challenge service unavailable"));
  }

  const token = await new SignJWT({ nonce })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(context.userId)
    .setExpirationTime(`${CHALLENGE_TTL_SECONDS}s`)
    .sign(secret);

  return cookieBridge.commit(
    apiResponse.success({
      nonce,
      message,
      expiresInSeconds: CHALLENGE_TTL_SECONDS,
      challengeToken: token,
    }),
  );
}

