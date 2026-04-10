import { apiResponse } from '@/lib/api-platform';

import { type NextRequest } from "next/server";
import { createClient } from "@/server/services/supabase/server";
import { provisionSafeWalletsForUser } from "@/server/services/safe/provision";
import { checkRateLimit, walletProvisionRateLimit } from "@/server/security/rate-limit";


import { logger } from '@/lib/logger';
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return apiResponse.serviceUnavailable("Service unavailable");
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiResponse.unauthorized("Unauthorized");
    }

    const rl = await checkRateLimit(user.id, walletProvisionRateLimit);
    if (!rl.success) {
      return apiResponse.error("RATE_LIMITED", "Too many wallet provision requests", 429);
    }

    // Trigger provisioning (idempotent)
    const results = await provisionSafeWalletsForUser(user.id);

    return apiResponse.success({ results });
  } catch (error) {
    logger.error("Wallet provision error:", error);
    return apiResponse.internalError("Internal Server Error");
  }
}
