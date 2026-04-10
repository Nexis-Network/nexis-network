import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { createClient } from "@/server/services/supabase/server";
import { invalidateUserTasksCache } from "@/server/tasks/cache";
import { cancelTaskForUser } from "@/server/tasks/repository";


import { logger } from '@/lib/logger';
const IS_PRODUCTION = process.env.NODE_ENV === "production";


export async function POST(request: Request) {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);

  try {
    const { context } = await resolveSupabaseContext(cookieBridge, { request });
    if (!context) {
      return cookieBridge.commit(
        apiResponse.unauthorized("Sign in required"),
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
       return cookieBridge.commit(apiResponse.badRequest("taskId payload required"));
    }

    const taskId = readTaskId(body);
    if (!taskId) {
      return cookieBridge.commit(
        apiResponse.badRequest("taskId is required"),
      );
    }

    const supabase = await createClient();
    if (!supabase) {
      throw new Error("Supabase client not available");
    }
    const success = await cancelTaskForUser(context.userId, taskId, supabase);
    if (!success) {
      throw new Error("Unable to cancel task");
    }

    await invalidateUserTasksCache(context.userId);

    return cookieBridge.commit(apiResponse.success({ ok: true }));
  } catch (error) {
    if (!IS_PRODUCTION) {
      logger.error("tasks_cancel_error", error);
    }
    return cookieBridge.commit(
        apiResponse.error("CANCEL_TASK_ERROR", error instanceof Error ? error.message : "Unable to cancel task", 502),
    );
  }
}

function readTaskId(data: Record<string, UntypedJson>): string | null {
  const candidates = ["taskId", "id", "task_id"];
  for (const key of candidates) {
    const value = data[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}
