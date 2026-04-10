type RouteContext = { params: Promise<{ daoId: string }> };

import { apiResponse } from "@/lib/api-platform";
import { daoErrorResponse, maybeRequireDaoAal2 } from "@/app/api/daos/_utils";
import { daoMembershipInputSchema } from "@/modules/daos/contracts";
import { revalidateDaoTags } from "@/server/daos/cache-tags";
import { commitDaoResponse, resolveDaoRequestContext } from "@/server/daos/http";
import { listDaoMembers, upsertDaoMembership } from "@/modules/daos/services/membership-service";

export async function GET(request: Request, ctxArg: RouteContext) {
  const ctxResult = await resolveDaoRequestContext(request);
  if (!ctxResult.ok) return ctxResult.response;
  const ctx = ctxResult.value;

  try {
    const { daoId } = await ctxArg.params;
    const members = await listDaoMembers({
      userId: ctx.userId,
      orgId: ctx.orgId,
      daoId,
    });

    return commitDaoResponse(ctx, apiResponse.success({ members }));
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
    const body = daoMembershipInputSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return commitDaoResponse(ctx, apiResponse.validationError(body.error));
    }

    const aal2Response = maybeRequireDaoAal2(
      ctx,
      body.data.membershipType === "agent" || Boolean(body.data.agentId),
    );
    if (aal2Response) {
      return commitDaoResponse(ctx, aal2Response);
    }

    const member = await upsertDaoMembership({
      userId: ctx.userId,
      orgId: ctx.orgId,
      daoId,
      input: body.data,
    });

    revalidateDaoTags({ orgId: ctx.orgId, daoId });
    return commitDaoResponse(ctx, apiResponse.success(member));
  } catch (error) {
    return commitDaoResponse(ctx, daoErrorResponse(error));
  }
}
