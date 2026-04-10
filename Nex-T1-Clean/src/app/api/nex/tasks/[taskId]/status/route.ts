import { cookies } from "next/headers";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { invalidateUserTasksCache } from "@/server/tasks/cache";
import { pauseTaskForUser, resumeTaskForUser, runTaskNowForUser } from "@/server/tasks/repository";
import { createClient } from "@/server/services/supabase/server";

const ActionSchema = z.object({
  action: z.enum(["pause", "resume", "run_now"]),
});


type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function POST(request: Request, routeContext: RouteContext) {
  const jar = await cookies();
  const bridge = createCookieBridge(jar);

  try {
    const { context: auth } = await resolveSupabaseContext(bridge, { request });
    if (!auth) {
      return bridge.commit(apiResponse.unauthorized("Sign in required"));
    }

    const { taskId } = await routeContext.params;
    if (!taskId) {
      return bridge.commit(apiResponse.badRequest("Task id is required"));
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return bridge.commit(apiResponse.badRequest("Action payload required"));
    }

    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) {
      return bridge.commit(apiResponse.badRequest(`Invalid action: ${JSON.stringify(parsed.error.flatten())}`));
    }

    const supabase = await createClient();
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    let success = false;
    switch (parsed.data.action) {
      case "pause":
        success = await pauseTaskForUser(auth.userId, taskId, supabase);
        break;
      case "resume":
        success = await resumeTaskForUser(auth.userId, taskId, supabase);
        break;
      case "run_now":
        success = await runTaskNowForUser(auth.userId, taskId, supabase);
        break;
      default:
        success = false;
    }

    if (!success) {
      return bridge.commit(apiResponse.badRequest("Unable to apply action"));
    }

    await invalidateUserTasksCache(auth.userId);

    return bridge.commit(apiResponse.success({ ok: true }));
  } catch (error) {
    return bridge.commit(
      apiResponse.error("TASK_STATUS_ERROR", error instanceof Error ? error.message : "Unable to update task status", 502),
    );
  }
}
