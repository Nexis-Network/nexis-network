import { NextRequest } from "next/server";

import { withAuth } from "@/server/security/with-auth";
import { apiResponse } from "@/lib/api-platform";
import { checkRateLimit } from "@/server/security/rate-limit-lite";
import { dataClient } from "@/server/services/polymarket/data-client";
import { credentialStore } from "@/server/services/polymarket/credential-store";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { logger } from "@/lib/logger";


export async function GET(request: NextRequest) {
  const auth = await withAuth(request, { allowPublic: false });
  if (!auth.ok) return auth.response;

  const userId = auth.session?.user?.id;
  if (!userId) return apiResponse.unauthorized();

  const rl = await checkRateLimit(`polymarket:positions:${userId}`);
  if (!rl.success) {
    return apiResponse.error("RATE_LIMITED", "Too many requests", 429);
  }

  try {
    const supabase = getSupabaseAdminClient();
    const creds = await credentialStore.load(supabase, userId);
    if (!creds) {
      return apiResponse.badRequest(
        "No Polymarket credentials found. Please connect your wallet first.",
        "NO_CREDENTIALS",
      );
    }

    const data = await dataClient.getPositionsPayload(creds.polyAddress);
    return apiResponse.success(data);
  } catch (error) {
    logger.error("[polymarket:positions] GET failed", { userId, error });
    return apiResponse.internalError("Failed to fetch positions");
  }
}
