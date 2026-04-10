import { NextRequest } from "next/server";
import { z } from "zod";

import { withAuth } from "@/server/security/with-auth";
import { apiResponse } from "@/lib/api-platform";
import { validateBody } from "@/lib/api-platform/validation";
import { checkRateLimit } from "@/server/security/rate-limit-lite";
import { credentialStore } from "@/server/services/polymarket/credential-store";
import { createClient } from "@/server/services/supabase/server";
import { POLYMARKET_SIGNATURE_TYPE } from "@/server/services/polymarket/constants";
import type { PolymarketSignatureType } from "@/server/services/polymarket/constants";
import { logger } from "@/lib/logger";


const saveCredsSchema = z.object({
  polyAddress: z.string().min(1, "polyAddress is required"),
  apiKey: z.string().min(1, "apiKey is required"),
  secret: z.string().min(1, "secret is required"),
  passphrase: z.string().min(1, "passphrase is required"),
  signatureType: z.coerce
    .number()
    .refine(
      (v) => Object.values(POLYMARKET_SIGNATURE_TYPE).includes(v as PolymarketSignatureType),
      "Invalid signatureType",
    )
    .default(POLYMARKET_SIGNATURE_TYPE.POLY_PROXY),
  funderAddress: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await withAuth(request, { allowPublic: false });
  if (!auth.ok) return auth.response;

  const userId = auth.session?.user?.id;
  if (!userId) return apiResponse.unauthorized();

  const rl = await checkRateLimit(`polymarket:creds:${userId}`);
  if (!rl.success) {
    return apiResponse.error("RATE_LIMITED", "Too many requests", 429);
  }

  try {
    const supabase = await createClient();
    if (!supabase) {
      return apiResponse.internalError("Database unavailable");
    }

    const creds = await credentialStore.load(supabase, userId);
    if (!creds) {
      return apiResponse.success({
        hasCredentials: false,
      });
    }

    return apiResponse.success({
      hasCredentials: true,
      polyAddress: creds.polyAddress,
      funderAddress: creds.funderAddress,
      signatureType: creds.signatureType,
    });
  } catch (error) {
    logger.error("[polymarket:creds] GET failed", { userId, error });
    return apiResponse.internalError("Failed to load credentials");
  }
}

export async function POST(request: NextRequest) {
  const auth = await withAuth(request, { allowPublic: false });
  if (!auth.ok) return auth.response;

  const userId = auth.session?.user?.id;
  if (!userId) return apiResponse.unauthorized();

  const rl = await checkRateLimit(`polymarket:creds:${userId}`);
  if (!rl.success) {
    return apiResponse.error("RATE_LIMITED", "Too many requests", 429);
  }

  const validation = await validateBody(request, saveCredsSchema);
  if (!validation.success) return validation.response;

  const { polyAddress, apiKey, secret, passphrase, signatureType, funderAddress } = validation.data;

  try {
    const supabase = await createClient();
    if (!supabase) {
      return apiResponse.internalError("Database unavailable");
    }
    await credentialStore.save(
      supabase,
      userId,
      polyAddress,
      { apiKey, secret, passphrase },
      signatureType as PolymarketSignatureType,
      funderAddress,
    );

    return apiResponse.created({ saved: true });
  } catch (error) {
    logger.error("[polymarket:creds] POST failed", { userId, error });
    return apiResponse.internalError("Failed to save credentials");
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await withAuth(request, { allowPublic: false });
  if (!auth.ok) return auth.response;

  const userId = auth.session?.user?.id;
  if (!userId) return apiResponse.unauthorized();

  try {
    const supabase = await createClient();
    if (!supabase) {
      return apiResponse.internalError("Database unavailable");
    }
    await credentialStore.deactivate(supabase, userId);
    return apiResponse.success({ deactivated: true });
  } catch (error) {
    logger.error("[polymarket:creds] DELETE failed", { userId, error });
    return apiResponse.internalError("Failed to deactivate credentials");
  }
}
