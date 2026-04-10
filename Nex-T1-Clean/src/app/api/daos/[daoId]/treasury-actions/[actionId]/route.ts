type RouteContext = { params: Promise<{ daoId: string; actionId: string }> };

import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { daoErrorResponse, maybeRequireDaoAal2 } from "@/app/api/daos/_utils";
import { revalidateDaoTags } from "@/server/daos/cache-tags";
import { commitDaoResponse, resolveDaoRequestContext } from "@/server/daos/http";
import { updateDaoTreasuryAction } from "@/modules/daos/services/treasury-service";

const UpdateTreasuryActionSchema = z.object({
  status: z
    .enum([
      "draft",
      "pending_approval",
      "approved",
      "submitted",
      "executed",
      "failed",
      "cancelled",
    ])
    .optional(),
  txHash: z.string().nullable().optional(),
  lastError: z.string().nullable().optional(),
  approvalRequestId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(request: Request, ctxArg: RouteContext) {
  const ctxResult = await resolveDaoRequestContext(request);
  if (!ctxResult.ok) return ctxResult.response;
  const ctx = ctxResult.value;

  try {
    const { daoId, actionId } = await ctxArg.params;
    const body = UpdateTreasuryActionSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return commitDaoResponse(ctx, apiResponse.validationError(body.error));
    }

    const aal2Response = maybeRequireDaoAal2(ctx, true);
    if (aal2Response) {
      return commitDaoResponse(ctx, aal2Response);
    }

    const treasuryAction = await updateDaoTreasuryAction({
      userId: ctx.userId,
      orgId: ctx.orgId,
      daoId,
      actionId,
      patch: {
        status: body.data.status,
        txHash: body.data.txHash,
        lastError: body.data.lastError,
        approvalRequestId: body.data.approvalRequestId,
        metadata:
          (body.data.metadata as Record<string, UntypedJson> | undefined) ?? undefined,
      },
    });

    revalidateDaoTags({ orgId: ctx.orgId, daoId });
    return commitDaoResponse(ctx, apiResponse.success(treasuryAction));
  } catch (error) {
    return commitDaoResponse(ctx, daoErrorResponse(error));
  }
}
