import { type NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse, validateBody } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { createClient as createServerSupabaseClient } from "@/server/services/supabase/server";
import { invalidateUserWalletsCache } from "@/server/wallets/user-wallets";
import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";

import { timeApiRoute } from "@/server/instrumentation/metrics";
import { cookies } from "next/headers";


import { logger } from '@/lib/logger';
const syncWalletSchema = z.object({
  address: z.string().min(1),
  chainId: z.number().int().positive(),
  type: z.string().optional().default("safe"),
});

export async function POST(req: NextRequest) {
  return timeApiRoute("wallets.sync.POST", async () => {
    const cookieBridge = createCookieBridge(await cookies());
    const { context } = await resolveSupabaseContext(cookieBridge, { request: req });

    if (!context?.userId) {
      return cookieBridge.commit(apiResponse.unauthorized());
    }

    const localOwnerEnabled =
      process.env.LOCAL_OWNER_ENABLED?.trim().toLowerCase() === "true" ||
      process.env.NODE_ENV !== "production";

    if (!localOwnerEnabled) {
      return cookieBridge.commit(
        apiResponse.forbidden("Local wallet sync is disabled in production.")
      );
    }

    const validation = await validateBody(req, syncWalletSchema);
    if (!validation.success) {
        return cookieBridge.commit(validation.response);
    }

    const { address, chainId, type } = validation.data;
    const walletType = type;

    if (walletType !== "safe") {
        return cookieBridge.commit(apiResponse.error("INVALID_WALLET_TYPE", "Invalid wallet type", 400));
    }
    
    // Custom check outside schema because it depends on import library
    if (!isNonZeroEVMAddress(address)) {
        return cookieBridge.commit(apiResponse.error("INVALID_ADDRESS", "Invalid EVM address", 400));
    }

    try {
        const supabase = await createServerSupabaseClient();
        if (!supabase) {
            return cookieBridge.commit(apiResponse.error("SERVICE_UNAVAILABLE", "Database unavailable", 503));
        }

        // Check if wallet already exists
        const { data: existingWallet } = await supabase
        .from("wallet_accounts")
        .select("status, safe_address")
        .eq("user_id", context.userId)
        .eq("chain_id", chainId)
        .eq("wallet_type", walletType)
        .maybeSingle();

        const newStatus = existingWallet?.status === "ready" ? "ready" : "active";
        const newSafeAddress = existingWallet?.safe_address ?? address;

        const walletData = {
            user_id: context.userId,
            chain_id: chainId,
            safe_address: newSafeAddress,
            wallet_type: walletType,
            status: newStatus,
            updated_at: new Date().toISOString(),
            metadata: {
                provider: "safe",
                isCustodial: false,
                createdAt: new Date().toISOString(),
            }
        };

        const { error } = await supabase
            .from("wallet_accounts")
            .upsert(walletData, {
                onConflict: "user_id,chain_id,wallet_type" 
            });

        if (error) {
            logger.error("[WalletSync] Failed to sync wallet:", error);
            return cookieBridge.commit(apiResponse.internalError(error.message));
        }

        // Invalidate cache
        await invalidateUserWalletsCache(context.userId);

        return cookieBridge.commit(apiResponse.success({ wallet: walletData }));

    } catch (error) {
        logger.error("[WalletSync] Unexpected error:", error);
        return cookieBridge.commit(apiResponse.internalError(error instanceof Error ? error.message : "Unknown error"));
    }
  });
}
