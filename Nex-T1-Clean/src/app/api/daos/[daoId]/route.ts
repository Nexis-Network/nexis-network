type RouteContext = { params: Promise<{ daoId: string }> };

import { apiResponse } from "@/lib/api-platform";
import { maybeRequireDaoAal2, daoErrorResponse } from "@/app/api/daos/_utils";
import { daoUpdateInputSchema } from "@/modules/daos/contracts";
import { revalidateDaoTags } from "@/server/daos/cache-tags";
import { commitDaoResponse, resolveDaoRequestContext } from "@/server/daos/http";
import { getDaoOverview } from "@/modules/daos/services/directory-service";
import { updateDao } from "@/modules/daos/services/lifecycle-service";

export async function GET(request: Request, ctxArg: RouteContext) {
  const ctxResult = await resolveDaoRequestContext(request);
  if (!ctxResult.ok) return ctxResult.response;
  const ctx = ctxResult.value;

  try {
    const { daoId } = await ctxArg.params;
    const overview = await getDaoOverview({
      userId: ctx.userId,
      orgId: ctx.orgId,
      daoId,
    });

    return commitDaoResponse(ctx, apiResponse.success(overview));
  } catch (error) {
    return commitDaoResponse(ctx, daoErrorResponse(error));
  }
}

export async function PATCH(request: Request, ctxArg: RouteContext) {
  const ctxResult = await resolveDaoRequestContext(request);
  if (!ctxResult.ok) return ctxResult.response;
  const ctx = ctxResult.value;

  try {
    const { daoId } = await ctxArg.params;
    const body = daoUpdateInputSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return commitDaoResponse(ctx, apiResponse.validationError(body.error));
    }

    const aal2Response = maybeRequireDaoAal2(
      ctx,
      Boolean(body.data.linkedAgentId) || body.data.ownershipMode !== undefined,
    );
    if (aal2Response) {
      return commitDaoResponse(ctx, aal2Response);
    }

    const overview = await updateDao({
      userId: ctx.userId,
      orgId: ctx.orgId,
      daoId,
      input: body.data,
    });

    revalidateDaoTags({ orgId: ctx.orgId, daoId });
    return commitDaoResponse(ctx, apiResponse.success(overview));
  } catch (error) {
    return commitDaoResponse(ctx, daoErrorResponse(error));
  }
}
