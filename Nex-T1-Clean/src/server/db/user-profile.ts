import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import {
  cachedQuery,
  CACHE_TTL,
  CACHE_NAMESPACE,
  userProfileCacheKey,
  invalidateCache,
} from "./cache";

/**
 * UserProfileData matches the `user_profiles` table from the credit_system migration.
 *
 * Columns: user_id (uuid PK), plan (text), created_at, updated_at.
 * This is the credit/plan table -- NOT the `profiles` table used for display name, avatar, etc.
 */
export type UserProfileData = {
  user_id: string;
  plan: "free" | "pro" | "trader" | "ultra" | "enterprise";
  created_at: string;
  updated_at: string;
};

/**
 * Fetch user credit/plan profile with caching.
 * Queries the `user_profiles` table (credit system) by `user_id`.
 */
export async function getUserProfile(
  userId: string,
  client?: SupabaseClient
): Promise<{ data: UserProfileData | null; error: UntypedJson }> {
  const supabase = client ?? getSupabaseAdminClient();
  const cacheKey = userProfileCacheKey(userId);

  return cachedQuery(
    async () =>
      await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single(),
    {
      key: cacheKey,
      namespace: CACHE_NAMESPACE.USER_PROFILE,
      ttlSeconds: CACHE_TTL.USER_PROFILE,
      staleTtlSeconds: CACHE_TTL.USER_PROFILE * 2, // 10 minutes stale
      coalesce: true,
    }
  );
}

/**
 * Update user credit/plan profile and invalidate cache.
 * Queries the `user_profiles` table (credit system) by `user_id`.
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfileData, "plan">>,
  client?: SupabaseClient
): Promise<{ data: UserProfileData | null; error: UntypedJson }> {
  const supabase = client ?? getSupabaseAdminClient();
  const cacheKey = userProfileCacheKey(userId);

  const result = await supabase
    .from("user_profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select()
    .single();

  // Invalidate cache after update
  await invalidateCache(cacheKey);

  return result as { data: UserProfileData | null; error: UntypedJson };
}

/**
 * Invalidate user profile cache
 */
export async function invalidateUserProfileCache(userId: string): Promise<void> {
  const cacheKey = userProfileCacheKey(userId);
  await invalidateCache(cacheKey);
}
