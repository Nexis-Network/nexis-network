import { redis } from "@/server/services/redis";

const TASK_CACHE_NAMESPACE = "user_tasks" as const;

export function buildUserTasksCacheKey(userId: string, queryKey: string): string {
  const suffix = queryKey.trim().length > 0 ? queryKey : "default";
  return `user:${userId}:tasks:${suffix}:v1`;
}

export async function rememberUserTasksCacheKey(userId: string, cacheKey: string) {
  const setKey = tasksSetKey(userId);
  try {
    await redis.sadd(setKey, cacheKey);
  } catch {
    // ignore tracking errors
  }
}

export async function invalidateUserTasksCache(userId: string) {
  const setKey = tasksSetKey(userId);
  let keys: string[] = [];
  try {
    keys = await redis.smembers(setKey);
  } catch {
    keys = [];
  }

  if (keys.length) {
    try {
      await redis.del(...keys);
    } catch {
      /* ignore */
    }
  }

  try {
    await redis.del(setKey);
  } catch {
    /* ignore */
  }
}

function tasksSetKey(userId: string) {
  return `${TASK_CACHE_NAMESPACE}:keys:${userId}`;
}
