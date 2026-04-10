import { apiResponse } from '@/lib/api-platform';
/**
 * Session Key Grant API
 * POST /api/wallets/session-keys/grant
 *
 * Grants a new session key for agent delegation
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/server/services/supabase/server";
import { checkRateLimit, sessionKeyGrantRateLimit } from "@/server/security/rate-limit";


import { logger } from '@/lib/logger';
const grantRequestSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number().int().positive(),
  sessionPublicKey: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  encryptedSessionPrivateKey: z.string().min(1),
  permissions: z.object({
    spendingLimit: z.string(),
    contractWhitelist: z.array(z.string()).default([]),
    allowedMethods: z.array(z.string()).optional(),
    validUntil: z.number().int().positive(),
  }),
  expiresAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
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

    const rl = await checkRateLimit(user.id, sessionKeyGrantRateLimit);
    if (!rl.success) {
      return apiResponse.error("RATE_LIMITED", "Too many session key grant requests", 429);
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = grantRequestSchema.safeParse(body);

    if (!validation.success) {
      return apiResponse.validationError(validation.error);
    }

    const {
      walletAddress,
      chainId,
      sessionPublicKey,
      encryptedSessionPrivateKey,
      permissions,
      expiresAt,
      metadata,
    } = validation.data;

    // Verify the user owns the wallet
    const { data: wallet, error: walletError } = await supabase
      .from("user_wallets")
      .select("id")
      .eq("user_id", user.id)
      .ilike("address", walletAddress)
      .single();

    if (walletError || !wallet) {
      return apiResponse.forbidden("Wallet not found or not owned by user");
    }

    // Check for existing active session key
    const { data: existingKey } = await supabase
      .from("wallet_session_keys")
      .select("id")
      .eq("user_id", user.id)
      .ilike("wallet_address", walletAddress)
      .eq("chain_id", chainId)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (existingKey) {
      // Revoke existing key before creating new one
      await supabase
        .from("wallet_session_keys")
        .update({
          revoked_at: new Date().toISOString(),
          revocation_reason: "Replaced by new session key",
        })
        .eq("id", existingKey.id);
    }

    // Create the new session key
    const { data: newKey, error: insertError } = await supabase
      .from("wallet_session_keys")
      .insert({
        user_id: user.id,
        wallet_address: walletAddress.toLowerCase(),
        chain_id: chainId,
        session_public_key: sessionPublicKey,
        encrypted_session_private_key: encryptedSessionPrivateKey,
        permissions,
        expires_at: expiresAt,
        granted_by: "user",
        metadata: metadata ?? {},
      })
      .select("id")
      .single();

    if (insertError) {
      logger.error("[SessionKeys] Grant error:", insertError);
      return apiResponse.internalError("Failed to create session key");
    }

    // Log the grant event
    await supabase.from("wallet_session_key_audit").insert({
      session_key_id: newKey.id,
      event_type: "granted",
      metadata: {
        chainId,
        permissions: {
          spendingLimit: permissions.spendingLimit,
          contractWhitelistCount: permissions.contractWhitelist.length,
          validUntil: permissions.validUntil,
        },
      },
    });

    return apiResponse.success({
      success: true,
      sessionKeyId: newKey.id,
      expiresAt,
    });
  } catch (error: UntypedJson) {
    logger.error("[SessionKeys] Unexpected error:", error instanceof Error ? error.message : String(error));
    return apiResponse.internalError("Internal server error");
  }
}
