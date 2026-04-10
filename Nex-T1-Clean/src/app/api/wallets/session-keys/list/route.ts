import { apiResponse } from '@/lib/api-platform';
/**
 * Session Key List API
 * GET /api/wallets/session-keys/list
 * 
 * Lists all session keys for the authenticated user
 */

import { connection, NextRequest } from "next/server";
import { createClient } from "@/server/services/supabase/server";


import { logger } from '@/lib/logger';
export async function GET(request: NextRequest) {
  await connection();
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const includeRevoked = searchParams.get("includeRevoked") === "true";
    const walletAddress = searchParams.get("walletAddress");
    const chainId = searchParams.get("chainId");

    // Build query
    let query = supabase
      .from("wallet_session_keys")
      .select(
        `
        id,
        wallet_address,
        chain_id,
        session_public_key,
        permissions,
        granted_at,
        expires_at,
        revoked_at,
        granted_by,
        revocation_reason,
        metadata
      `
      )
      .eq("user_id", user.id)
      .order("granted_at", { ascending: false });

    if (!includeRevoked) {
      query = query.is("revoked_at", null);
    }

    if (walletAddress) {
      query = query.ilike("wallet_address", walletAddress);
    }

    if (chainId) {
      query = query.eq("chain_id", parseInt(chainId, 10));
    }

    const { data: sessionKeys, error: queryError } = await query;

    if (queryError) {
      logger.error("[SessionKeys] List error:", queryError);
      return apiResponse.internalError("Failed to list session keys");
    }

    // Transform to camelCase for frontend
    const transformed = sessionKeys.map((key) => ({
      id: key.id,
      walletAddress: key.wallet_address,
      chainId: key.chain_id,
      sessionPublicKey: key.session_public_key,
      permissions: key.permissions,
      grantedAt: key.granted_at,
      expiresAt: key.expires_at,
      revokedAt: key.revoked_at,
      grantedBy: key.granted_by,
      revocationReason: key.revocation_reason,
      metadata: key.metadata,
      isActive: !key.revoked_at && new Date(key.expires_at) > new Date(),
    }));

    const response = apiResponse.success({
      success: true,
      sessionKeys: transformed,
    });
    response.headers.set("Deprecation", "true");
    response.headers.set("Link", "</api/automation/session-keys>; rel=\"alternate\"");
    return response;
  } catch (error: UntypedJson) {
    logger.error("[SessionKeys] Unexpected error:", error instanceof Error ? error.message : String(error));
    return apiResponse.internalError("Internal server error");
  }
}
