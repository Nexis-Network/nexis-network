import { cookies } from "next/headers";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { decideTaskRunForUser } from "@/server/tasks/repository";
import { invalidateUserTasksCache } from "@/server/tasks/cache";
import { createClient } from "@/server/services/supabase/server";

const RunDecisionSchema = z.object({
  decision: z.enum(["approve", "dismiss"]),
  note: z.string().max(500).optional(),
});

const getRunIdFromParams = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

type RouteContext = {
  params: Promise<{
    runId?: string | string[];
  }>;
};


export async function POST(request: Request, routeContext: RouteContext) {
  const jar = await cookies();
  const bridge = createCookieBridge(jar);

  try {
    const routeParams = await routeContext.params;
    const runId = getRunIdFromParams(routeParams.runId);

    if (!runId) {
      return bridge.commit(apiResponse.badRequest("Missing task run id"));
    }

    const { context: authContext } = await resolveSupabaseContext(bridge, { request });
    if (!authContext) {
      return bridge.commit(apiResponse.unauthorized("Sign in required"));
    }

    const parsedBody = await request.json().catch(() => null);
    if (!parsedBody || typeof parsedBody !== "object") {
       return bridge.commit(apiResponse.badRequest("decision payload required"));
    }

    const parsed = RunDecisionSchema.safeParse(parsedBody);
    if (!parsed.success) {
      return bridge.commit(
        apiResponse.badRequest(`Invalid payload: ${JSON.stringify(parsed.error.flatten())}`),
      );
    }

    const supabase = await createClient();
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    const result = await decideTaskRunForUser(authContext.userId, runId, parsed.data.decision, parsed.data.note, supabase);
    await invalidateUserTasksCache(authContext.userId);

    return bridge.commit(apiResponse.success({ ok: true, status: result.status }));
  } catch (error) {
    return bridge.commit(
      apiResponse.error("DECISION_ERROR", error instanceof Error ? error.message : "Unable to submit decision", 502),
    );
  }
}
