import { NextRequest } from "next/server";
import { z } from "zod";

import { withAuth } from "@/server/security/with-auth";
import { apiResponse } from "@/lib/api-platform";
import { executeAllowanceTransfer } from "@/server/services/safe/allowance-executor";
import { emitWalletEvent } from "@/server/notifications/emit";
import { checkRateLimit, txExecuteRateLimit } from "@/server/security/rate-limit";


const BodySchema = z.object({
  chainId: z.number().int().positive(),
  safeAddress: z.string().min(1),
  tokenAddress: z.string().min(1).optional(),
  to: z.string().min(1),
  amountWei: z.string().regex(/^\d+$/u),
});

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, { allowPublic: false, requireOrg: true });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();

  const rl = await checkRateLimit(auth.session.user.id, txExecuteRateLimit);
  if (!rl.success) {
    return apiResponse.error("RATE_LIMITED", "Too many transaction execution requests", 429);
  }

  let parsed: z.infer<typeof BodySchema> | null = null;

  try {
    const body = BodySchema.parse(await req.json());
    parsed = body;

    const out = await executeAllowanceTransfer({
      userId: auth.session.user.id,
      chainId: body.chainId,
      safeAddress: body.safeAddress,
      tokenAddress: body.tokenAddress,
      to: body.to,
      amountWei: body.amountWei,
    });

    await emitWalletEvent({
      user_id: auth.session.user.id,
      chain_id: body.chainId,
      safe_address: body.safeAddress,
      event_type: "allowance_transfer_executed",
      status: "success",
      title: "Allowance transfer executed",
      body: `Transferred ${body.amountWei} wei to ${body.to}.`,
      metadata: { txHash: out.txHash, to: body.to, amountWei: body.amountWei, tokenAddress: body.tokenAddress ?? null },
    });

    return apiResponse.success({ ok: true, txHash: out.txHash });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => i.message).join(", ");
      return apiResponse.badRequest(`Invalid request: ${issues}`);
    }

    const message = error instanceof Error ? error.message : "Failed to execute allowance transfer";

    // Known allowance policy failures should return 403 and trigger an \"insufficient\" notification.
    const allowanceError = ["policy_disabled", "no_allowance_for_token", "allowance_exceeded"].includes(message);
    if (allowanceError) {
      void emitWalletEvent({
        user_id: auth.session.user.id,
        chain_id: parsed?.chainId,
        safe_address: parsed?.safeAddress,
        event_type: "allowance_insufficient",
        status: "warning",
        title: "Allowance insufficient",
        body: "The requested transfer exceeds the configured allowance.",
        metadata: { reason: message },
      });
      return apiResponse.forbidden("Allowance insufficient: " + message);
    }

    if (message === "allowance_module_unavailable") {
      return apiResponse.badRequest("Allowance module unavailable");
    }

    return apiResponse.internalError(message);
  }
}
