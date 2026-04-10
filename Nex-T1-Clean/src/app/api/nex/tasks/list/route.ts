import { connection } from "next/server";
import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import type { NormalizedTaskList } from "@/modules/tasks";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getOrSet } from "@/server/services/redis/cache";
import {
  buildUserTasksCacheKey,
  rememberUserTasksCacheKey,
} from "@/server/tasks/cache";
import { fetchTasksForUser } from "@/server/tasks/repository";

const CACHE_NAMESPACE = "user_tasks";


export async function GET(request: Request) {
  await connection();
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);

  try {
    const { context } = await resolveSupabaseContext(cookieBridge, { request });
    if (!context) {
      return cookieBridge.commit(
        apiResponse.unauthorized(),
      );
    }

    const url = new URL(request.url);
    const queryKey = serializeSearchParams(url.searchParams);
    const cacheKey = buildUserTasksCacheKey(context.userId, queryKey);

    const status = url.searchParams.get("status") ?? undefined;
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;
    const offsetParam = url.searchParams.get("offset");
    const offset = offsetParam ? Number(offsetParam) : undefined;

    const envelope = await getOrSet(
      cacheKey,
      async () => fetchTasksForUser(context.userId, { status, limit, offset }),
      {
        ttlSeconds: 30,
        staleTtlSeconds: 90,
        coalesce: true,
        lockTtlSeconds: 10,
        namespace: CACHE_NAMESPACE,
        serialize: (value) => JSON.stringify(value),
        deserialize: deserializeTasksEnvelope,
      },
    );

    await rememberUserTasksCacheKey(context.userId, cacheKey);

    return cookieBridge.commit(apiResponse.success(envelope));
  } catch {
    return cookieBridge.commit(apiResponse.success(buildEmptyTasksEnvelope()));
  }
}

function serializeSearchParams(params: URLSearchParams): string {
  const entries = Array.from(params.entries()).filter(([key]) => key !== "");
  if (entries.length === 0) return "";
  return entries
    .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function deserializeTasksEnvelope(raw: UntypedJson): NormalizedTaskList | null {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const obj = parsed as Partial<NormalizedTaskList>;
    if (!Array.isArray(obj.tasks)) {
      return null;
    }
    return {
      tasks: obj.tasks as NormalizedTaskList["tasks"],
      total: typeof obj.total === "number" ? obj.total : obj.tasks.length,
      hasMore: typeof obj.hasMore === "boolean" ? obj.hasMore : false,
      nextOffset: typeof obj.nextOffset === "number" ? obj.nextOffset : null,
      fetchedAt:
        typeof obj.fetchedAt === "string" ? obj.fetchedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function buildEmptyTasksEnvelope(): NormalizedTaskList {
  return {
    tasks: [],
    total: 0,
    hasMore: false,
    nextOffset: null,
    fetchedAt: new Date().toISOString(),
  };
}

// legacy dev helper removed in favor of persisted data
