type RouteContext = { params: Promise<{ daoId: string }> };

import { apiResponse } from "@/lib/api-platform";
import { daoCapabilityPatchSchema } from "@/modules/daos/contracts";
import { daoErrorResponse, maybeRequireDaoAal2 } from "@/app/api/daos/_utils";
import { revalidateDaoTags } from "@/server/daos/cache-tags";
import { commitDaoResponse, resolveDaoRequestContext } from "@/server/daos/http";
import { getDaoOverview } from "@/modules/daos/services/directory-service";
import { updateDaoCapabilities } from "@/modules/daos/services/lifecycle-service";

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

    return commitDaoResponse(
      ctx,
      apiResponse.success({ capabilities: overview.capabilities }),
    );
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
    const body = daoCapabilityPatchSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return commitDaoResponse(ctx, apiResponse.validationError(body.error));
    }

    const aal2Response = maybeRequireDaoAal2(
      ctx,
      body.data.agentAutomationEnabled === true ||
        body.data.agentVotingEnabled === true,
    );
    if (aal2Response) {
      return commitDaoResponse(ctx, aal2Response);
    }

    const capabilities = await updateDaoCapabilities({
      userId: ctx.userId,
      orgId: ctx.orgId,
      daoId,
      patch: body.data,
    });

    revalidateDaoTags({ orgId: ctx.orgId, daoId });
    return commitDaoResponse(ctx, apiResponse.success(capabilities));
  } catch (error) {
    return commitDaoResponse(ctx, daoErrorResponse(error));
  }
}
