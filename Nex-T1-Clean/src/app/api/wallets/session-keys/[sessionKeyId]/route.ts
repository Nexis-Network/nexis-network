import { apiResponse } from '@/lib/api-platform';
/**
 * Session Key Details API
 * GET /api/wallets/session-keys/[sessionKeyId]
 * 
 * Gets details and audit history for a specific session key
 */

import { NextRequest } from "next/server";
import { createClient } from "@/server/services/supabase/server";


import { logger } from '@/lib/logger';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionKeyId: string }> }
) {
  try {
    const { sessionKeyId } = await params;

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

    // Get session key
    const { data: sessionKey, error: keyError } = await supabase
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
      .eq("id", sessionKeyId)
      .eq("user_id", user.id)
      .single();

    if (keyError || !sessionKey) {
      return apiResponse.notFound("Session key not found");
    }

    // Get audit history
    const { data: auditHistory, error: auditError } = await supabase
      .from("wallet_session_key_audit")
      .select(
        `
        id,
        event_type,
        event_timestamp,
        operation_type,
        operation_value,
        operation_to,
        success,
        error_message,
        metadata
      `
      )
      .eq("session_key_id", sessionKeyId)
      .order("event_timestamp", { ascending: false })
      .limit(50);

    if (auditError) {
      logger.error("[SessionKeys] Audit query error:", auditError);
      // Don't fail, just return empty audit
    }

    // Transform to camelCase
    const transformedKey = {
      id: sessionKey.id,
      walletAddress: sessionKey.wallet_address,
      chainId: sessionKey.chain_id,
      sessionPublicKey: sessionKey.session_public_key,
      permissions: sessionKey.permissions,
      grantedAt: sessionKey.granted_at,
      expiresAt: sessionKey.expires_at,
      revokedAt: sessionKey.revoked_at,
      grantedBy: sessionKey.granted_by,
      revocationReason: sessionKey.revocation_reason,
      metadata: sessionKey.metadata,
      isActive:
        !sessionKey.revoked_at &&
        new Date(sessionKey.expires_at) > new Date(),
    };

    const transformedAudit = (auditHistory ?? []).map((entry) => ({
      id: entry.id,
      eventType: entry.event_type,
      eventTimestamp: entry.event_timestamp,
      operationType: entry.operation_type,
      operationValue: entry.operation_value,
      operationTo: entry.operation_to,
      success: entry.success,
      errorMessage: entry.error_message,
      metadata: entry.metadata,
    }));

    return apiResponse.success({
      success: true,
      sessionKey: transformedKey,
      auditHistory: transformedAudit,
    });
  } catch (error: UntypedJson) {
    logger.error("[SessionKeys] Unexpected error:", error instanceof Error ? error.message : String(error));
    return apiResponse.internalError("Internal server error");
  }
}
