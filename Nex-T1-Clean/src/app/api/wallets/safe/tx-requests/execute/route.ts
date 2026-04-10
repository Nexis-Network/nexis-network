import { NextRequest } from "next/server";
import { z } from "zod";

import { withAuth } from "@/server/security/with-auth";
import { requireAal2 } from "@/server/security/mfa-assurance";
import { apiResponse } from "@/lib/api-platform";
import { executeApprovedSafeTxRequest } from "@/server/services/safe/tx-requests";
import { emitWalletEvent } from "@/server/notifications/emit";


const BodySchema = z.object({
  requestId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, { allowPublic: false, requireOrg: true });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();

  const aal = requireAal2(auth.session);
  if (!aal.ok) return aal.response;

  let requestId: string | null = null;

  try {
    const body = BodySchema.parse(await req.json());
    requestId = body.requestId;

    const out = await executeApprovedSafeTxRequest({
      userId: auth.session.user.id,
      requestId: body.requestId,
    });

    await emitWalletEvent({
      user_id: auth.session.user.id,
      event_type: "safe_tx_executed",
      status: "success",
      title: "Safe transaction executed",
      body: `On-chain tx submitted (${out.txHash}).`,
      metadata: { requestId: body.requestId, txHash: out.txHash },
    });

    return apiResponse.success({ ok: true, txHash: out.txHash });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => i.message).join(", ");
      return apiResponse.badRequest(`Invalid request: ${issues}`);
    }

    const message = error instanceof Error ? error.message : "Failed to execute Safe transaction";

    void emitWalletEvent({
      user_id: auth.session.user.id,
      event_type: "safe_tx_failed",
      status: "error",
      title: "Safe transaction failed",
      body: "Transaction execution failed.",
      metadata: { requestId, reason: message },
    });

    return apiResponse.internalError(message);
  }
}
