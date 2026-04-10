import { NextRequest } from "next/server";
import { z } from "zod";

import { withAuth } from "@/server/security/with-auth";
import { apiResponse } from "@/lib/api-platform";
import { createSafeTxRequest } from "@/server/services/safe/tx-requests";
import { emitWalletEvent } from "@/server/notifications/emit";
import { buildSafeActivationPayload } from "@/server/services/safe/activation";


const BodySchema = z.object({
  chainId: z.number().int().positive(),
  safeAddress: z.string().min(1),
  to: z.string().min(1),
  valueWei: z.string().regex(/^\d+$/u),
  data: z.string().min(2),
  createdBy: z.enum(["user", "agent"]).default("user"),
  requiresMfa: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, { allowPublic: false, requireOrg: true });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();

  try {
    const body = BodySchema.parse(await req.json());

    const activation = await buildSafeActivationPayload({
      userId: auth.session.user.id,
      chainId: body.chainId,
      safeAddress: body.safeAddress,
    });
    if (activation.status === "activation_required") {
      return apiResponse.success({ error: "safe_activation_required", activation: activation.activation });
    }

    const out = await createSafeTxRequest({
      userId: auth.session.user.id,
      chainId: body.chainId,
      safeAddress: body.safeAddress,
      to: body.to,
      valueWei: body.valueWei,
      data: body.data,
      createdBy: body.createdBy,
      requiresMfa: body.requiresMfa,
    });

    // Best-effort wallet event + push enqueue.
    await emitWalletEvent({
      user_id: auth.session.user.id,
      chain_id: body.chainId,
      safe_address: body.safeAddress,
      event_type: "safe_tx_proposed",
      status: "info",
      title: "Safe transaction proposed",
      body: `Proposed tx to ${body.to} (${body.valueWei} wei).`,
      metadata: {
        requestId: out.requestId,
        safeTxHash: out.safeTxHash,
        safeAddress: body.safeAddress,
        to: body.to,
        valueWei: body.valueWei,
        createdBy: body.createdBy,
      },
    });

    if (body.createdBy === "agent" || body.requiresMfa) {
      await emitWalletEvent({
        user_id: auth.session.user.id,
        chain_id: body.chainId,
        safe_address: body.safeAddress,
        event_type: "safe_tx_approval_requested",
        status: "info",
        title: "Approval requested",
        body: "A Safe transaction requires your approval.",
        metadata: {
          requestId: out.requestId,
          safeTxHash: out.safeTxHash,
          safeAddress: body.safeAddress,
        },
      });
    }

    return apiResponse.success({
      requestId: out.requestId,
      safeTxHash: out.safeTxHash,
      safeTxData: out.safeTxData,
      nonce: out.nonce,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => i.message).join(", ");
      return apiResponse.badRequest(`Invalid request: ${issues}`);
    }

    const message = error instanceof Error ? error.message : "Failed to propose Safe transaction";
    return apiResponse.internalError(message);
  }
}
