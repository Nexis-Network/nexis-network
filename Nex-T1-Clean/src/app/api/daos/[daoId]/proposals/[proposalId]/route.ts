type RouteContext = { params: Promise<{ daoId: string; proposalId: string }> };

import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { daoErrorResponse, maybeRequireDaoAal2 } from "@/app/api/daos/_utils";
import { revalidateDaoTags } from "@/server/daos/cache-tags";
import { commitDaoResponse, resolveDaoRequestContext } from "@/server/daos/http";
import { updateDaoProposalStatus } from "@/modules/daos/services/proposal-service";

const UpdateProposalStatusSchema = z.object({
  status: z.enum([
    "draft",
    "active",
    "succeeded",
    "defeated",
    "queued",
    "executed",
    "cancelled",
    "expired",
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(request: Request, ctxArg: RouteContext) {
  const ctxResult = await resolveDaoRequestContext(request);
  if (!ctxResult.ok) return ctxResult.response;
  const ctx = ctxResult.value;

  try {
    const { daoId, proposalId } = await ctxArg.params;
    const body = UpdateProposalStatusSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return commitDaoResponse(ctx, apiResponse.validationError(body.error));
    }

    const aal2Response = maybeRequireDaoAal2(ctx, body.data.status !== "draft");
    if (aal2Response) {
      return commitDaoResponse(ctx, aal2Response);
    }

    const proposal = await updateDaoProposalStatus({
      userId: ctx.userId,
      orgId: ctx.orgId,
      daoId,
      proposalId,
      status: body.data.status,
      metadata: (body.data.metadata as Record<string, UntypedJson> | undefined) ?? undefined,
    });

    revalidateDaoTags({ orgId: ctx.orgId, daoId });
    return commitDaoResponse(ctx, apiResponse.success(proposal));
  } catch (error) {
    return commitDaoResponse(ctx, daoErrorResponse(error));
  }
}
