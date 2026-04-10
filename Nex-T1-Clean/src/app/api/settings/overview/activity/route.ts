import { connection } from "next/server";
import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getOverviewContributionGraph } from "@/server/settings/overview-activity";

export async function GET(request: Request) {
  await connection();

  const jar = await cookies();
  const bridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(bridge, {
    refreshSession: false,
    request,
  });

  if (!context?.userId) {
    return bridge.commit(apiResponse.unauthorized());
  }

  const payload = await getOverviewContributionGraph(String(context.userId));
  const response = apiResponse.success(payload);
  response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=600");
  return bridge.commit(response);
}
