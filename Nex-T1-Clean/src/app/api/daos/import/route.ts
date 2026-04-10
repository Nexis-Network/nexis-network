import { apiResponse } from "@/lib/api-platform";
import { parseDaoDirectoryFilters, daoErrorResponse, maybeRequireDaoAal2 } from "@/app/api/daos/_utils";
import { daoImportInputSchema } from "@/modules/daos/contracts";
import { revalidateDaoTags } from "@/server/daos/cache-tags";
import { commitDaoResponse, resolveDaoRequestContext } from "@/server/daos/http";
import { listDaoDirectory } from "@/modules/daos/services/directory-service";
import { importDao } from "@/modules/daos/services/lifecycle-service";

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
      filters: { ...filters, importSource: "imported" },
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
    const body = daoImportInputSchema.safeParse(await request.json().catch(() => null));
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

    const overview = await importDao({
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
