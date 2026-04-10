import { connection } from "next/server";
import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { fetchTaskHistoryForUser } from "@/server/tasks/repository";
import { createClient } from "@/server/services/supabase/server";

import { logger } from '@/lib/logger';
// import type { TaskResult } from "@/lib/schema";


export async function GET(request: Request) {
  await connection();
  const jar = await cookies();
  const bridge = createCookieBridge(jar);

  try {
    const { context } = await resolveSupabaseContext(bridge, { request });
    if (!context) {
      return bridge.commit(apiResponse.unauthorized("Sign in required"));
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "20");
    const offset = Number(url.searchParams.get("offset") ?? "0");

    const supabase = await createClient();
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    const runs = await fetchTaskHistoryForUser(context.userId, {
      limit: Number.isFinite(limit) ? limit : 20,
      offset: Number.isFinite(offset) ? offset : 0,
    }, supabase);

    return bridge.commit(
      apiResponse.success({
        tasks: runs,
        hasMore: runs.length === (Number.isFinite(limit) ? limit : 20),
      }),
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.error("tasks_history_error", error);
    }
    return bridge.commit(
      apiResponse.error("TASK_HISTORY_ERROR", error instanceof Error ? error.message : "Unable to load history", 502),
    );
  }
}

