import { apiResponse } from '@/lib/api-platform';
import { NextRequest } from "next/server";
import { z } from "zod";

import { withAuth } from "@/server/security/with-auth";
import { requireAal2 } from "@/server/security/mfa-assurance";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { emitWalletEvent } from "@/server/notifications/emit";
import { resolveSocialRecoveryModuleAddress } from "@/server/services/safe/recovery";

// Note: If we need to encode data for on-chain interaction later, import from viem and usage
// import { encodeFunctionData } from "viem";
// import { createSafeTxRequestFromTransactions } from "@/server/services/safe/safe-tx-service";
// import { RECOVERY_MODULE_ABI } from "@/server/services/safe/recovery";


const BodySchema = z.object({
  chainId: z.number().int().positive(),
  safeAddress: z.string().startsWith("0x"),
  newOwners: z.array(z.string().startsWith("0x")).min(1),
  newThreshold: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, { allowPublic: false, requireOrg: false });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();
  const session = auth.session;

  // Recovery initiation is a sensitive action - likely require AAL2 if triggered by owner.
  // But guardians might be external. For this implementation, we assume the USER is triggering it
  // (e.g. lost one key, using another, or using a recovery key they control).
  // Ideally, guardians call the contract directly. This API is for "App-assisted recovery"
  // where the user might still have access but wants to rotate via recovery module?
  //
  // Actually, standard "Social Recovery" assumes the OWNER has LOST access. 
  // If the owner has lost access, they CANNOT call this API with their old `session`.
  //
  // However, often "Recovery" is also "Rotation" or the user has a secondary sign-in method.
  // We will enforce AAL2 if they are logged in.
  
  // 2. MFA Check
  const assurance = requireAal2(session);
  if (!assurance.ok) return assurance.response;

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }
  const { chainId, safeAddress, newOwners, newThreshold } = parsed.data;

  const supabase = getSupabaseAdminClient();
  
  // Verify recovery config exists
  const { data: config } = await supabase
    .from("wallet_recovery_config")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("chain_id", chainId)
    .eq("safe_address", safeAddress)
    .maybeSingle();

  if (!config?.enabled) {
    return apiResponse.badRequest("Recovery not enabled", "recovery_not_enabled");
  }

  const moduleAddress = resolveSocialRecoveryModuleAddress(chainId);
  if (!moduleAddress) {
    return apiResponse.badRequest("Recovery module unavailable for chain", "recovery_module_unavailable");
  }
  
  // Create a record of the request
  const { data: reqRow, error: reqError } = await supabase.from("wallet_recovery_requests").insert({
    user_id: session.user.id,
    chain_id: chainId,
    safe_address: safeAddress,
    new_owners: newOwners,
    new_threshold: newThreshold,
    status: "proposed",
    metadata: {
      module_address: moduleAddress,
    },
  }).select().single();

  if (reqError) {
    return apiResponse.internalError("DB insert failed", "db_insert_failed");
  }

  await emitWalletEvent({
    user_id: session.user.id,
    chain_id: chainId,
    safe_address: safeAddress,
    event_type: "recovery_initiated",
    status: "warning",
    title: "Recovery Initiated",
    body: "A recovery request has been started.",
    metadata: { requestId: reqRow.id }
  });

  return apiResponse.success({ ok: true, requestId: reqRow.id });
}
