import { apiResponse } from '@/lib/api-platform';
/**
 * Session Key Revoke API
 * POST /api/wallets/session-keys/revoke
 * 
 * Revokes a specific session key
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/server/services/supabase/server";


import { logger } from '@/lib/logger';
const revokeRequestSchema = z.object({
  sessionKeyId: z.string().uuid(),
  reason: z.string().max(500).optional().default("User revoked"),
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    if (!supabase) {
      return apiResponse.serviceUnavailable("Database connection failed");
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiResponse.unauthorized("Authentication required");
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = revokeRequestSchema.safeParse(body);

    if (!validation.success) {
      return apiResponse.validationError(validation.error);
    }

    const { sessionKeyId, reason } = validation.data;

    // Use the database function to revoke
    const { data: revoked, error: revokeError } = await supabase.rpc(
      "revoke_session_key",
      {
        p_session_key_id: sessionKeyId,
        p_user_id: user.id,
        p_reason: reason,
      }
    );

    if (revokeError) {
      logger.error("[SessionKeys] Revoke error:", revokeError);
      return apiResponse.internalError("Failed to revoke session key");
    }

    if (!revoked) {
      return apiResponse.notFound("Session key not found or already revoked");
    }

    return apiResponse.success({
      success: true,
      message: "Session key revoked",
    });
  } catch (error: UntypedJson) {
    logger.error("[SessionKeys] Unexpected error:", error instanceof Error ? error.message : String(error));
    return apiResponse.internalError("Internal server error");
  }
}
