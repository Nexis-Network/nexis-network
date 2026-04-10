import { connection } from "next/server";
import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { fetchTaskRunDetailForUser } from "@/server/tasks/repository";
import { createClient } from "@/server/services/supabase/server";


type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

export async function GET(request: Request, routeContext: RouteContext) {
  await connection();
  const jar = await cookies();
  const bridge = createCookieBridge(jar);

  try {
    const { context } = await resolveSupabaseContext(bridge, { request });
    if (!context) {
      return bridge.commit(apiResponse.unauthorized("Sign in required"));
    }

    const { runId } = await routeContext.params;
    const supabase = await createClient();
    if (!supabase) {
      throw new Error("Supabase client not available");
    }
    const detail = await fetchTaskRunDetailForUser(context.userId, runId, supabase);
    return bridge.commit(apiResponse.success({ run: detail }));
  } catch (error) {
    return bridge.commit(
      apiResponse.error("RUN_DETAIL_ERROR", error instanceof Error ? error.message : "Unable to load run detail", 502),
    );
  }
}
