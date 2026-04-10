import { apiResponse } from "@/lib/api-platform";
import {
  daoCreateInputSchema,
} from "@/modules/daos/contracts";
import { parseDaoDirectoryFilters, daoErrorResponse, maybeRequireDaoAal2 } from "@/app/api/daos/_utils";
import { revalidateDaoTags } from "@/server/daos/cache-tags";
import { commitDaoResponse, resolveDaoRequestContext } from "@/server/daos/http";
import { listDaoDirectory } from "@/modules/daos/services/directory-service";
import { createDao } from "@/modules/daos/services/lifecycle-service";

export async function GET(request: Request) {
  const ctxResult = await resolveDaoRequestContext(request);
  if (!ctxResult.ok) return ctxResult.response;
  const ctx = ctxResult.value;

  try {
    const url = new URL(request.url);
    const filters = parseDaoDirectoryFilters(url.searchParams);
    const directory = await listDaoDirectory({
      userId: ctx.userId,
      orgId: ctx.orgId,
      filters,
    });

    return commitDaoResponse(ctx, apiResponse.success({ daos: directory }));
  } catch (error) {
    return commitDaoResponse(ctx, daoErrorResponse(error));
  }
}

export async function POST(request: Request) {
  const ctxResult = await resolveDaoRequestContext(request);
  if (!ctxResult.ok) return ctxResult.response;
  const ctx = ctxResult.value;

  try {
    const body = daoCreateInputSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return commitDaoResponse(ctx, apiResponse.validationError(body.error));
    }

    const aal2Response = maybeRequireDaoAal2(
      ctx,
      body.data.ownershipMode !== "user" || Boolean(body.data.linkedAgentId),
    );
    if (aal2Response) {
      return commitDaoResponse(ctx, aal2Response);
    }

    const overview = await createDao({
      userId: ctx.userId,
      orgId: ctx.orgId,
      input: body.data,
    });

    revalidateDaoTags({
      orgId: ctx.orgId,
      daoId: overview.dao.id,
    });

    return commitDaoResponse(ctx, apiResponse.created(overview));
  } catch (error) {
    return commitDaoResponse(ctx, daoErrorResponse(error));
  }
}
