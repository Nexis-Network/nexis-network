import { connection, NextRequest } from "next/server";

import { createClient } from "@/server/services/supabase/server";
import {
  getNonProductionTestModeUserId,
  isNonProductionTestMode,
} from "@/server/auth/test-mode";
import { apiResponse } from "@/lib/api-platform";
import { isEnsSubnameLabelAvailable } from "@/server/services/ens/subnames";
import { validateEnsSubnameLabel } from "@/lib/ens/subnames";


import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  await connection();
  try {
    const supabase = await createClient();
    if (!supabase) {
      return apiResponse.serviceUnavailable("Database unavailable");
    }

    const { data: { user } } = await supabase.auth.getUser();
    const testModeUserId = isNonProductionTestMode({ request })
      ? getNonProductionTestModeUserId({ request })
      : null;
    const effectiveUserId = user?.id ?? testModeUserId;

    if (!effectiveUserId) {
      return apiResponse.unauthorized("Unauthorized");
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim();

    if (!username) {
      return apiResponse.success({ available: false, reason: "Username is required" });
    }

    if (
      testModeUserId &&
      effectiveUserId === testModeUserId
    ) {
      const validation = validateEnsSubnameLabel(username);
      return apiResponse.success({
        available: validation.valid,
        reason: validation.valid ? null : validation.error ?? "Username is invalid.",
        normalizedLabel: validation.valid ? validation.normalizedLabel : "",
      });
    }

    const availability = await isEnsSubnameLabelAvailable({
      userId: effectiveUserId,
      label: username,
    });

    return apiResponse.success({ 
      available: availability.available,
      reason: availability.reason,
      normalizedLabel: availability.normalizedLabel,
    });
  } catch (error) {
    logger.error("[API] Check username error:", error);
    return apiResponse.internalError("Failed to check username");
  }
}



