type RouteContext = { params: Promise<{ daoId: string; actionId: string }> };

import { apiResponse } from "@/lib/api-platform";
import { daoErrorResponse, maybeRequireDaoAal2 } from "@/app/api/daos/_utils";
import { revalidateDaoTags } from "@/server/daos/cache-tags";
import { commitDaoResponse, resolveDaoRequestContext } from "@/server/daos/http";
import { executeDaoTreasuryAction } from "@/modules/daos/services/treasury-service";

export async function POST(request: Request, ctxArg: RouteContext) {
  const ctxResult = await resolveDaoRequestContext(request);
  if (!ctxResult.ok) return ctxResult.response;
  const ctx = ctxResult.value;

  try {
    const { daoId, actionId } = await ctxArg.params;

    const aal2Response = maybeRequireDaoAal2(ctx, true);
    if (aal2Response) {
      return commitDaoResponse(ctx, aal2Response);
    }

    const treasuryAction = await executeDaoTreasuryAction({
      userId: ctx.userId,
      orgId: ctx.orgId,
      daoId,
      actionId,
    });

    revalidateDaoTags({ orgId: ctx.orgId, daoId });
    return commitDaoResponse(ctx, apiResponse.success(treasuryAction));
  } catch (error) {
    return commitDaoResponse(ctx, daoErrorResponse(error));
  }
}
