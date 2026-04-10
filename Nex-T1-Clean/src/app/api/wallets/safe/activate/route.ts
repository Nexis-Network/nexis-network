import { NextRequest } from "next/server";
import { z } from "zod";

import { withAuth } from "@/server/security/with-auth";
import { apiResponse } from "@/lib/api-platform";
import { buildSafeActivationPayload } from "@/server/services/safe/activation";


const BodySchema = z.object({
  chainId: z.number().int().positive(),
  safeAddress: z.string().min(1),
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

    if (activation.status === "ready") {
      return apiResponse.success({ ok: true, status: "ready", safeAddress: activation.safeAddress });
    }

    return apiResponse.success({ ok: true, status: "activation_required", activation: activation.activation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => i.message).join(", ");
      return apiResponse.badRequest(`Invalid request: ${issues}`);
    }
    const message = error instanceof Error ? error.message : "Failed to build activation transaction";
    return apiResponse.internalError(message);
  }
}
