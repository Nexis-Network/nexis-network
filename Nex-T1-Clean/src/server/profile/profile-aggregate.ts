import { redis, isRedisConfigured } from "@/server/services/redis";
import { metrics } from "@/server/instrumentation/metrics";
import { getErrorMessage } from "@/lib/utils/error";
import { createEmptyProfile, type ProfileAggregate } from "@/lib/user/profile";
import type { SupabaseAuthContext } from "@/server/auth/auth-context";
import { resolveUserWallets } from "@/server/wallets/user-wallets";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { getActiveEnsNameForUser } from "@/server/services/ens/subnames";
import {
  getCachedProfileAggregate,
  setCachedProfileAggregate,
} from "@/server/profile/profile-cache";

import { logger } from "@/lib/logger";
// Domain: profile
// Responsibility: Assemble a lightweight ProfileAggregate for UI + chat context.
// Depends on: Supabase auth context, wallet inventory (server/wallets), Redis cache.
// Notes:
// - Profile aggregation is backed by Supabase plus the current Nex-native wallet services.

type WalletSnapshotPromptInput = {
  accessToken: string | null;
  userId: string | null;
  profile?: ProfileAggregate | null;
  forceRefresh?: boolean;
};

const PROFILE_CACHE_TTL_SECONDS = 45;
const WALLET_SNAPSHOT_CACHE_TTL_SECONDS = 5 * 60;

function toNumericUserId(value: UntypedJson): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export async function fetchRemoteProfileAggregate(
  _accessToken: string,
): Promise<ProfileAggregate | null> {
  // Remote profile aggregation is optional.
  // Keep a stub to preserve call sites; we can reintroduce a Nex backend endpoint later.
  return null;
}

/**
 * Load profile display data from the `profiles` table using service-role client.
 * Note: uploaded avatar URLs are preserved here; generated avatars are resolved
 * later in the UI when no uploaded asset exists.
 */
async function loadProfileDisplayData(userId: string) {
  try {
    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient
      .from("profiles")
      .select("display_name, username, avatar_url, avatar_seed, avatar_kind, avatar_version, bio, locale, time_zone, metadata")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return data as {
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
      avatar_seed: string | null;
      avatar_kind: string | null;
      avatar_version: number | null;
      bio: string | null;
      locale: string | null;
      time_zone: string | null;
      metadata: Record<string, unknown> | null;
    };
  } catch (err) {
    logger.warn("[profile] loadProfileDisplayData failed", getErrorMessage(err, "profile_display_failed"));
    return null;
  }
}

async function loadActiveEnsName(userId: string): Promise<string | null> {
  try {
    return await getActiveEnsNameForUser(userId);
  } catch (err) {
    logger.warn("[profile] loadActiveEnsName failed", getErrorMessage(err, "profile_ens_failed"));
    return null;
  }
}

/**
 * Load MFA status for the user from user_mfa table.
 */
async function loadMfaStatusForAggregate(userId: string) {
  try {
    const serviceClient = createServiceRoleClient();
    const { data } = await serviceClient
      .from("user_mfa")
      .select("verified, verified_at")
      .eq("user_id", userId)
      .eq("type", "totp")
      .maybeSingle();

    return {
      mfaEnabled: data?.verified === true,
      mfaEnrolledAt: (data?.verified_at as string) ?? null,
    };
  } catch {
    return { mfaEnabled: false, mfaEnrolledAt: null };
  }
}

/**
 * Load active session count for the user.
 */
async function loadActiveSessionCountForAggregate(userId: string) {
  try {
    const serviceClient = createServiceRoleClient();
    const { count } = await serviceClient
      .from("user_session")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("revoked", false);

    return count ?? null;
  } catch {
    return null;
  }
}

export async function resolveProfileAggregate(
  context: SupabaseAuthContext | null | undefined,
  _options?: { enrich?: boolean },
): Promise<ProfileAggregate> {
  if (!context?.userId) {
    return createEmptyProfile();
  }

  const userId = String(context.userId);

  const cached = await getCachedProfileAggregate(userId).catch(() => null);
  if (cached) {
    metrics.cacheHit("profile_aggregate");
    return cached;
  }
  metrics.cacheMiss("profile_aggregate");

  const base = createEmptyProfile();
  base.identity.userId = toNumericUserId(context.userId);
  base.identity.email = (context.email ?? null) as string | null;

  // Fetch wallets, profile display data, MFA status, and session count in parallel
  const [wallets, profileData, ensName, mfaStatus, activeSessionCount] = await Promise.all([
    resolveUserWallets(userId).catch((error) => {
      logger.warn(
        "[profile] resolveUserWallets failed",
        getErrorMessage(error, "resolveUserWallets_failed"),
      );
      return [] as ProfileAggregate["wallets"];
    }),
    loadProfileDisplayData(userId),
    loadActiveEnsName(userId),
    loadMfaStatusForAggregate(userId),
    loadActiveSessionCountForAggregate(userId),
  ]);

  base.wallets = wallets;

  // Populate identity from profiles table
  if (profileData) {
    base.identity.displayName = profileData.display_name;
    base.identity.ensName = ensName;
    base.identity.username = profileData.username;
    base.identity.avatarUrl = profileData.avatar_url ?? null;
    base.identity.avatarSeed = profileData.avatar_seed ?? null;
    base.identity.avatarKind = profileData.avatar_kind === "uploaded" ? "uploaded" : "generated";
    base.identity.avatarVersion = profileData.avatar_version ?? 1;
    base.identity.bio = profileData.bio;
    base.identity.locale = profileData.locale;
    base.identity.timeZone = profileData.time_zone;
    base.identity.metadata = profileData.metadata as Record<string, UntypedJson> | null;
    base.bio = profileData.bio;
    base.locale = profileData.locale;
  } else {
    base.identity.ensName = ensName;
  }

  // Populate security data
  base.security.mfaEnabled = mfaStatus.mfaEnabled;
  base.security.activeSessionCount = activeSessionCount;
  // lastLoginAt comes from Supabase session user data if available
  if (context.session?.user) {
    const userRecord = context.session.user;
    const lastSignIn = userRecord.last_sign_in_at ?? userRecord.lastSignInAt;
    if (typeof lastSignIn === "string" && (lastSignIn as string).length > 0) {
      base.security.lastLoginAt = lastSignIn as string;
    }
  }

  await setCachedProfileAggregate(
    userId,
    base,
    PROFILE_CACHE_TTL_SECONDS,
  ).catch(() => {});
  return base;
}

function buildWalletSnapshotText(profile: ProfileAggregate): string {
  const wallets = Array.isArray(profile.wallets) ? profile.wallets : [];
  if (wallets.length === 0) {
    return "Wallet snapshot: none.";
  }

  const lines = wallets.slice(0, 8).map((w) => {
    const label =
      (typeof w.metadata?.label === "string" &&
      w.metadata.label.trim().length > 0
        ? w.metadata.label.trim()
        : w.providerName) ?? "Wallet";
    const address =
      typeof w.address === "string" && w.address.length > 0 ? w.address : "";
    const chains =
      Array.isArray(w.topChains) && w.topChains.length
        ? w.topChains
            .slice(0, 3)
            .map((c) => c.name)
            .filter((n): n is string => typeof n === "string" && n.length > 0)
            .join(", ")
        : "";

    return `- ${label}${chains ? ` (${chains})` : ""}${address ? `: ${address}` : ""}`;
  });

  const more = wallets.length > 8 ? `\n- (+${wallets.length - 8} more)` : "";
  return `Wallet snapshot (${wallets.length}):\n${lines.join("\n")}${more}`;
}

export async function buildWalletSnapshotPrompt(
  input: WalletSnapshotPromptInput,
): Promise<string | null> {
  const userId = input.userId?.trim() ?? null;
  if (!userId) return null;

  const cacheKey = `wallet_snapshot:v2:${userId}`;

  if (!input.forceRefresh && isRedisConfigured) {
    const cached = await redis.get<string>(cacheKey).catch(() => null);
    if (cached) {
      metrics.cacheHit("wallet_snapshot_prompt");
      return cached;
    }
  }
  metrics.cacheMiss("wallet_snapshot_prompt");

  let profile = input.profile ?? null;
  if (!profile) {
    profile = createEmptyProfile();
    profile.identity.userId = toNumericUserId(userId);
    try {
      profile.wallets = await resolveUserWallets(userId);
    } catch (error) {
      logger.warn(
        "[profile] resolveUserWallets failed",
        getErrorMessage(error, "resolveUserWallets_failed"),
      );
      profile.wallets = [];
    }
  }

  const snapshot = buildWalletSnapshotText(profile);

  if (isRedisConfigured) {
    await redis
      .set(cacheKey, snapshot, { ex: WALLET_SNAPSHOT_CACHE_TTL_SECONDS })
      .catch(() => {});
  }

  return snapshot;
}
