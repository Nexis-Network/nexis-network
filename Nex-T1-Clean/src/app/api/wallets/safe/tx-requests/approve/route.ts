import { NextRequest } from "next/server";
import { z } from "zod";

import { withAuth } from "@/server/security/with-auth";
import { requireAal2 } from "@/server/security/mfa-assurance";
import { apiResponse } from "@/lib/api-platform";
import { approveSafeTxRequest } from "@/server/services/safe/tx-requests";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { emitWalletEvent } from "@/server/notifications/emit";


const BodySchema = z.object({
  requestId: z.string().uuid(),
  signature: z.string().min(2),
});

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, { allowPublic: false, requireOrg: true });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();

  const aal = requireAal2(auth.session);
  if (!aal.ok) return aal.response;

  const localOwnerEnabled =
    process.env.LOCAL_OWNER_ENABLED?.trim().toLowerCase() === "true" ||
    process.env.NODE_ENV !== "production" ||
    process.env.E2E_TEST_MODE === "true";

  if (!localOwnerEnabled) {
    return apiResponse.forbidden("Local owner approvals are disabled.");
  }

  try {
    const body = BodySchema.parse(await req.json());

    const supabase = getSupabaseAdminClient();
    const { data: signers, error } = await supabase
      .from("wallet_signers")
      .select("address")
      .eq("user_id", auth.session.user.id)
      .eq("signer_kind", "user_owner")
      .limit(1);

    if (error) {
      return apiResponse.internalError(error.message);
    }

    const userOwner = (signers?.[0]?.address as string | undefined)?.trim() ?? "";
    if (!userOwner) {
      return apiResponse.badRequest("Missing user owner");
    }

    const out = await approveSafeTxRequest({
      userId: auth.session.user.id,
      requestId: body.requestId,
      userOwner,
      signature: body.signature,
    });

    await emitWalletEvent({
      user_id: auth.session.user.id,
      event_type: "safe_tx_approved",
      status: "success",
      title: "Safe transaction approved",
      body: "Owner signature accepted and recorded.",
      metadata: { requestId: body.requestId, safeTxHash: out.safeTxHash },
    });

    return apiResponse.success({ ok: true, safeTxHash: out.safeTxHash });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => i.message).join(", ");
      return apiResponse.badRequest(`Invalid request: ${issues}`);
    }

    const message = error instanceof Error ? error.message : "Failed to approve Safe transaction";
    return apiResponse.internalError(message);
  }
}
