import { apiResponse } from '@/lib/api-platform';
/**
 * Session Key Revoke All API
 * POST /api/wallets/session-keys/revoke-all
 * 
 * Revokes all session keys for a wallet (optionally filtered by chain)
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/server/services/supabase/server";


import { logger } from '@/lib/logger';
const revokeAllRequestSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number().int().positive().optional(),
  reason: z.string().max(500).optional().default("User revoked all"),
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
    const validation = revokeAllRequestSchema.safeParse(body);

    if (!validation.success) {
      return apiResponse.validationError(validation.error);
    }

    const { walletAddress, chainId, reason } = validation.data;

    // Build the update query
    let query = supabase
      .from("wallet_session_keys")
      .update({
        revoked_at: new Date().toISOString(),
        revocation_reason: reason,
      })
      .eq("user_id", user.id)
      .ilike("wallet_address", walletAddress)
      .is("revoked_at", null);

    if (chainId) {
      query = query.eq("chain_id", chainId);
    }

    const { error: revokeError, count } = await query;

    if (revokeError) {
      logger.error("[SessionKeys] Revoke all error:", revokeError);
      return apiResponse.internalError("Failed to revoke session keys");
    }

    return apiResponse.success({
      success: true,
      message: `Revoked ${count ?? 0} session keys`,
      count: count ?? 0,
    });
  } catch (error: UntypedJson) {
    logger.error("[SessionKeys] Unexpected error:", error instanceof Error ? error.message : String(error));
    return apiResponse.internalError("Internal server error");
  }
}
