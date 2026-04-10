import { apiResponse } from "@/lib/api-platform";
import {
  createDaoTreasuryApproval,
  daoErrorResponse,
  maybeRequireDaoAal2,
} from "@/app/api/daos/_utils";
import { daoTreasuryActionInputSchema } from "@/modules/daos/contracts";
import {
  createDaoTreasuryAction,
  listDaoTreasuryActions,
} from "@/modules/daos/services/treasury-service";
import { revalidateDaoTags } from "@/server/daos/cache-tags";
import { commitDaoResponse, resolveDaoRequestContext } from "@/server/daos/http";

type RouteContext = { params: Promise<{ daoId: string }> };

export async function GET(request: Request, ctxArg: RouteContext) {
  const ctxResult = await resolveDaoRequestContext(request);
  if (!ctxResult.ok) return ctxResult.response;
  const ctx = ctxResult.value;

  try {
    const { daoId } = await ctxArg.params;
    const treasuryActions = await listDaoTreasuryActions({
      userId: ctx.userId,
      orgId: ctx.orgId,
      daoId,
    });

    return commitDaoResponse(ctx, apiResponse.success({ treasuryActions }));
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
    const body = daoTreasuryActionInputSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return commitDaoResponse(ctx, apiResponse.validationError(body.error));
    }

    const aal2Response = maybeRequireDaoAal2(ctx, true);
    if (aal2Response) {
      return commitDaoResponse(ctx, aal2Response);
    }

    const approvalRequestId =
      body.data.approvalRequestId ??
      (await createDaoTreasuryApproval({
        ctx,
        daoId,
        action: body.data,
        request,
      }));

    const treasuryAction = await createDaoTreasuryAction({
      userId: ctx.userId,
      orgId: ctx.orgId,
      daoId,
      input: {
        ...body.data,
        approvalRequestId,
      },
    });

    revalidateDaoTags({ orgId: ctx.orgId, daoId });
    return commitDaoResponse(
      ctx,
      apiResponse.created({
        ...treasuryAction,
        approvalRequestId,
      }),
    );
  } catch (error) {
    return commitDaoResponse(ctx, daoErrorResponse(error));
  }
}
