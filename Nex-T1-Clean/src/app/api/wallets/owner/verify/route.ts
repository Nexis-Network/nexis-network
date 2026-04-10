import { cookies } from "next/headers";
import { z } from "zod";
import { verifyMessage, type Address, isAddress } from "viem";
import { jwtVerify } from "jose";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { requireAal2FromClaims } from "@/server/security/mfa-assurance";
import { redis, isRedisConfigured } from "@/server/services/redis";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { enqueueJob } from "@/server/queues/enqueue";


import { logger } from '@/lib/logger';

const BodySchema = z.object({
  ownerAddress: z.string().min(10),
  signature: z.string().min(10),
  challengeToken: z.string().min(10).optional(),
});

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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
    return cookieBridge.commit(apiResponse.unauthorized("unauthorized"));
  }

  // In production, enforce AAL2 (MFA). In dev, we skip to allow easier testing.
  if (process.env.NODE_ENV === "production") {
    const aal = requireAal2FromClaims(context.claims);
    if (!aal.ok) {
      return cookieBridge.commit(aal.response);
    }
  }

  if (context.userId === "00000000-0000-0000-0000-000000000000" && process.env.NODE_ENV !== "development") {
    // In dev, we might have a mock user, but this flow requires a real user in DB.
    return cookieBridge.commit(apiResponse.unauthorized("unauthorized"));
  }

  const raw = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return cookieBridge.commit(apiResponse.badRequest("invalid_body"));
  }

  const ownerAddress = parsed.data.ownerAddress.trim() as Address;
  if (!isAddress(ownerAddress) || ownerAddress.toLowerCase() === ZERO_ADDRESS) {
    return cookieBridge.commit(apiResponse.badRequest("invalid_owner_address"));
  }

  let nonce: string | null = null;

  if (isRedisConfigured) {
    const nonceKey = `wallet_owner_challenge:${context.userId}`;
    nonce = await redis.get<string>(nonceKey);
    if (!nonce) {
      return cookieBridge.commit(apiResponse.badRequest("challenge_expired"));
    }
  } else {
    const secret = resolveChallengeSecret();
    if (!secret) {
      logger.error("[verify] 503 Error: Challenge secret is missing.");
      return cookieBridge.commit(apiResponse.serviceUnavailable("challenge_unavailable"));
    }
    if (!parsed.data.challengeToken) {
      return cookieBridge.commit(apiResponse.badRequest("challenge_expired"));
    }
    try {
      const { payload } = await jwtVerify(parsed.data.challengeToken, secret, { algorithms: ["HS256"] });
      if (payload.sub !== context.userId) {
        return cookieBridge.commit(apiResponse.unauthorized("invalid_challenge"));
      }
      nonce = String((payload).nonce ?? "");
      if (!nonce) {
        return cookieBridge.commit(apiResponse.unauthorized("invalid_challenge"));
      }
    } catch {
      return cookieBridge.commit(apiResponse.unauthorized("invalid_challenge"));
    }
  }

  const message = `Nex-T1 wallet owner registration nonce: ${nonce}`;
  const isValid = await verifyMessage({
    address: ownerAddress,
    message,
    signature: parsed.data.signature as `0x${string}`,
  }).catch(() => false);

  if (!isValid) {
    return cookieBridge.commit(apiResponse.unauthorized("invalid_signature"));
  }

  const supabase = getSupabaseAdminClient();
  
  // Skip DB write for mock user in development
  if (context.userId === "00000000-0000-0000-0000-000000000000" && process.env.NODE_ENV === "development") {
      // Mock success for dev
      return cookieBridge.commit(apiResponse.success({ ok: true }));
  }

  // Upsert user owner signer record.
  const upsert = await supabase.from("wallet_signers").upsert(
    {
      user_id: context.userId,
      signer_kind: "user_owner",
      address: ownerAddress,
      encrypted_private_key: null,
      metadata: { verifiedAt: new Date().toISOString(), verifier: "viem.verifyMessage", ownerKind: "eoa" },
    },
    { onConflict: "user_id,signer_kind" },
  );

  if (upsert.error) {
    logger.error("[Verify API] Upsert Error:", JSON.stringify(upsert.error, null, 2));
    return cookieBridge.commit(apiResponse.internalError(upsert.error.message));
  }

  // Consume nonce (Redis mode only)
  if (isRedisConfigured) {
    const nonceKey = `wallet_owner_challenge:${context.userId}`;
    await redis.del(nonceKey).catch(() => {});
  }

  // Kick off wallet bootstrap asynchronously.
  void enqueueJob("user_wallet_bootstrap", {
    userId: context.userId,
    email: context.email ?? null,
    source: "wallets.owner.verify",
  });

  return cookieBridge.commit(apiResponse.success({ ok: true }));
}
