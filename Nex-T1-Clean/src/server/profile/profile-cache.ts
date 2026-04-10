import type { ProfileAggregate } from "@/lib/user/profile";
import { redis } from "@/server/services/redis";

export const PROFILE_CACHE_NAMESPACE = "profile:aggregate:v2";

export function profileCacheKey(userId: string) {
  return `${PROFILE_CACHE_NAMESPACE}:${userId}`;
}

export async function getCachedProfileAggregate(userId: string) {
  try {
    return (await redis.get<ProfileAggregate>(profileCacheKey(userId))) ?? null;
  } catch {
    return null;
  }
}

export async function setCachedProfileAggregate(userId: string, profile: ProfileAggregate, ttlSeconds: number) {
  try {
    await redis.set(profileCacheKey(userId), profile, { ex: ttlSeconds });
  } catch {}
}

export async function invalidateProfileAggregate(userId: string) {
  try {
    await redis.del(profileCacheKey(userId));
  } catch {}
}

