type RouteContext = { params: Promise<{ daoId: string }> };

import { apiResponse } from "@/lib/api-platform";
import { daoErrorResponse, maybeRequireDaoAal2 } from "@/app/api/daos/_utils";
import { daoProposalInputSchema } from "@/modules/daos/contracts";
import { revalidateDaoTags } from "@/server/daos/cache-tags";
import { commitDaoResponse, resolveDaoRequestContext } from "@/server/daos/http";
import { createDaoProposal, listDaoProposals } from "@/modules/daos/services/proposal-service";

export async function GET(request: Request, ctxArg: RouteContext) {
  const ctxResult = await resolveDaoRequestContext(request);
  if (!ctxResult.ok) return ctxResult.response;
  const ctx = ctxResult.value;

  try {
    const { daoId } = await ctxArg.params;
    const proposals = await listDaoProposals({
      userId: ctx.userId,
      orgId: ctx.orgId,
      daoId,
    });

    return commitDaoResponse(ctx, apiResponse.success({ proposals }));
  } catch (error) {
    return commitDaoResponse(ctx, daoErrorResponse(error));
  }
}

export async function POST(request: Request, ctxArg: RouteContext) {
  const ctxResult = await resolveDaoRequestContext(request);
  if (!ctxResult.ok) return ctxResult.response;
  const ctx = ctxResult.value;

  try {
    const { daoId } = await ctxArg.params;
    const body = daoProposalInputSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return commitDaoResponse(ctx, apiResponse.validationError(body.error));
    }

    const aal2Response = maybeRequireDaoAal2(
      ctx,
      body.data.status !== "draft" || Boolean(body.data.proposerAgentId),
    );
    if (aal2Response) {
      return commitDaoResponse(ctx, aal2Response);
    }

    const proposal = await createDaoProposal({
      userId: ctx.userId,
      orgId: ctx.orgId,
      daoId,
      input: body.data,
    });

    revalidateDaoTags({ orgId: ctx.orgId, daoId });
    return commitDaoResponse(ctx, apiResponse.created(proposal));
  } catch (error) {
    return commitDaoResponse(ctx, daoErrorResponse(error));
  }
}
