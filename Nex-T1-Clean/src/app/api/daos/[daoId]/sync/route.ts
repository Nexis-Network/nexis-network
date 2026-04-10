type RouteContext = { params: Promise<{ daoId: string }> };

import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { daoErrorResponse } from "@/app/api/daos/_utils";
import { revalidateDaoTags } from "@/server/daos/cache-tags";
import { commitDaoResponse, resolveDaoRequestContext } from "@/server/daos/http";
import { syncDao } from "@/modules/daos/services/sync-service";

const SyncBodySchema = z.object({
  jobType: z.string().min(2).max(120).optional(),
});

export async function POST(request: Request, ctxArg: RouteContext) {
  const ctxResult = await resolveDaoRequestContext(request);
  if (!ctxResult.ok) return ctxResult.response;
  const ctx = ctxResult.value;

  try {
    const { daoId } = await ctxArg.params;
    const body = SyncBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!body.success) {
      return commitDaoResponse(ctx, apiResponse.validationError(body.error));
    }

    const syncJob = await syncDao({
      userId: ctx.userId,
      orgId: ctx.orgId,
      daoId,
      jobType: body.data.jobType,
    });

    revalidateDaoTags({ orgId: ctx.orgId, daoId });
    return commitDaoResponse(ctx, apiResponse.created(syncJob));
  } catch (error) {
    return commitDaoResponse(ctx, daoErrorResponse(error));
  }
}
