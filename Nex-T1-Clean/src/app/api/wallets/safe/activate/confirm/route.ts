import { NextRequest } from "next/server";
import { z } from "zod";

import { withAuth } from "@/server/security/with-auth";
import { apiResponse } from "@/lib/api-platform";
import { confirmSafeActivation } from "@/server/services/safe/activation";


const BodySchema = z.object({
  chainId: z.number().int().positive(),
  safeAddress: z.string().min(1),
  txHash: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, { allowPublic: false, requireOrg: true });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();

  try {
    const body = BodySchema.parse(await req.json());

    const result = await confirmSafeActivation({
      userId: auth.session.user.id,
      chainId: body.chainId,
      safeAddress: body.safeAddress,
      txHash: body.txHash ?? null,
    });

    if (result.status === "pending") {
      return apiResponse.error("safe_not_deployed", "Safe not deployed", 409, { status: "pending" });
    }

    return apiResponse.success({ ok: true, status: "ready", safeAddress: result.safeAddress });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => i.message).join(", ");
      return apiResponse.badRequest(`Invalid request: ${issues}`);
    }
    const message = error instanceof Error ? error.message : "Failed to confirm Safe activation";
    return apiResponse.internalError(message);
  }
}
