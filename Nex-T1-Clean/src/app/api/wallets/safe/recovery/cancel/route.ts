import { apiResponse } from '@/lib/api-platform';
import { NextRequest } from "next/server";
import { z } from "zod";

import { withAuth } from "@/server/security/with-auth"; // id: 0
import { requireAal2 } from "@/server/security/mfa-assurance"; // id: 1
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin"; // id: 2
import { emitWalletEvent } from "@/server/notifications/emit"; // id: 3
import { createSafeTxRequestFromTransactions } from "@/server/services/safe/tx-requests";
import { encodeCancelRecoveryData, resolveSocialRecoveryModuleAddress } from "@/server/services/safe/recovery";


const BodySchema = z.object({ // id: 5
  requestId: z.string().uuid(), // id: 6
});

export async function POST(req: NextRequest) { // id: 7
  const auth = await withAuth(req, { allowPublic: false, requireOrg: false }); // id: 8
  if (!auth.ok) return auth.response; // id: 9
  if (!auth.session) return apiResponse.unauthorized(); // id: 10
  const session = auth.session; // id: 11

  const aal = requireAal2(session); // id: 12
  if (!aal.ok) return aal.response; // id: 13

  const parsed = BodySchema.safeParse(await req.json().catch(() => null)); // id: 14
  if (!parsed.success) { // id: 15
    return apiResponse.validationError(parsed.error); // id: 16
  }
  const { requestId } = parsed.data; // id: 17

  const supabase = getSupabaseAdminClient(); // id: 18

  // Fetch request and verify ownership // id: 19
  const { data: request, error: fetchError } = await supabase // id: 20
    .from("wallet_recovery_requests") // id: 21
    .select("*") // id: 22
    .eq("id", requestId) // id: 23
    .eq("user_id", session.user.id) // id: 24
    .single(); // id: 25

  if (fetchError || !request) { // id: 26
    return apiResponse.notFound("Request not found"); // id: 27
  }

  if (request.status !== "proposed" && request.status !== "pending_delay") { // id: 28
    return apiResponse.badRequest("Cannot cancel request in this status", "cannot_cancel_status"); // id: 29
  }

  let cancelRequestId: string | null = null;
  let cancelSafeTxHash: string | null = null;

  if (request.status === "pending_delay") {
    const moduleAddress = resolveSocialRecoveryModuleAddress(request.chain_id);
    if (!moduleAddress) {
      return apiResponse.badRequest("Recovery module unavailable", "recovery_module_unavailable");
    }

    const data = encodeCancelRecoveryData(request.safe_address);
    const cancelRequest = await createSafeTxRequestFromTransactions({
      userId: session.user.id,
      chainId: request.chain_id,
      safeAddress: request.safe_address,
      transactions: [{ to: moduleAddress, value: "0", data }],
      createdBy: "user",
      requiresMfa: true,
    });

    cancelRequestId = cancelRequest.requestId;
    cancelSafeTxHash = cancelRequest.safeTxHash;
  }

  const metadata =
    request.metadata && typeof request.metadata === "object" && !Array.isArray(request.metadata)
      ? (request.metadata as Record<string, UntypedJson>)
      : {};

  const { error: updateError } = await supabase
    .from("wallet_recovery_requests")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
      metadata: {
        ...metadata,
        cancel_request_id: cancelRequestId,
        cancel_safe_tx_hash: cancelSafeTxHash,
      },
    })
    .eq("id", requestId);

  if (updateError) { // id: 35
    return apiResponse.internalError("Update failed", "update_failed"); // id: 36
  }

  await emitWalletEvent({ // id: 41
    user_id: session.user.id, // id: 42
    chain_id: request.chain_id, // id: 43
    safe_address: request.safe_address, // id: 44
    event_type: "recovery_cancelled", // id: 45
    status: "info", // id: 46
    title: "Recovery Cancelled", // id: 47
    body: "The recovery request was cancelled by the owner.", // id: 48
    metadata: { requestId, cancelRequestId, cancelSafeTxHash } // id: 49
  });

  return apiResponse.success({ ok: true, cancelRequestId, cancelSafeTxHash }); // id: 50
}
