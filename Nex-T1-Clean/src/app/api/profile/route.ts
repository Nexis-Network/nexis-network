import { NextRequest } from "next/server";
import { z } from "zod";
import { AuthApiError } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { apiResponse } from "@/lib/api-platform";
import { createClient } from "@/server/services/supabase/server";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import {
  withTimeoutFallback,
  withTimeoutFallbackResult,
} from "@/lib/utils/timeout";
import { normalizeAvatarSeed } from "@/lib/avatar/branded-avatar";
import { AVATAR_V1_VERSION } from "@/lib/avatar/branded-avatar.config";
import { resolveUserWallets } from "@/server/wallets/user-wallets";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { invalidateProfileAggregate } from "@/server/profile/profile-cache";
import { loadUserArtifactSummary } from "@/server/services/artifacts/user-artifacts";
import { isEnsSubnameLabel } from "@/lib/ens/subnames";
import {
  getActiveEnsNameForUser,
  hasActiveEnsSubname,
  isEnsSubnameLabelAvailable,
} from "@/server/services/ens/subnames";

import { logger } from "@/lib/logger";

const UpdateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  username: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || isEnsSubnameLabel(value),
      "Username must be ENS-safe.",
    )
    .nullable()
    .optional(),
  locale: z.string().trim().max(16).nullable().optional(),
  timeZone: z.string().trim().min(2).max(64).optional(),
  bio: z.string().trim().max(280).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  elevenlabsVoiceId: z.string().trim().min(1).max(255).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

async function loadWalletPortfolios(userId: string) {
  return withTimeoutFallback(resolveUserWallets(userId), {
    timeoutMs: 2500,
    fallback: () => [],
    scope: "profile_wallets",
  });
}

/**
 * Load MFA status from the user_mfa table.
 * Returns { mfaEnabled, enrolledAt } or safe defaults on failure.
 */
async function loadMfaStatus(userId: string) {
  try {
    const serviceClient = createServiceRoleClient();
    const { data: mfaRecord } = await serviceClient
      .from("user_mfa")
      .select("verified, verified_at")
      .eq("user_id", userId)
      .eq("type", "totp")
      .maybeSingle();

    return {
      mfaEnabled: mfaRecord?.verified === true,
      mfaEnrolledAt: mfaRecord?.verified_at ?? null,
    };
  } catch (error) {
    logger.warn("[profile] MFA status lookup failed, defaulting to false", error);
    return { mfaEnabled: false, mfaEnrolledAt: null };
  }
}

/**
 * Load basic usage stats: conversation count (30d) and credit usage (7d).
 */
async function loadUsageStats(userId: string, supabase: SupabaseClient) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let chatsLast30d = 0;
  let tokensUsedLast7d = 0;

  try {
    const { count } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo.toISOString());

    chatsLast30d = count ?? 0;
  } catch (error) {
    logger.warn("[profile] Conversation count query failed", error);
  }

  try {
    const serviceClient = createServiceRoleClient();
    const { data: creditRows } = await serviceClient
      .from("user_credit_usage")
      .select("used")
      .eq("user_id", userId)
      .gte("window_start", sevenDaysAgo.toISOString().slice(0, 10));

    if (creditRows && creditRows.length > 0) {
      tokensUsedLast7d = creditRows.reduce(
        (sum: number, row: { used: number }) => sum + (row.used ?? 0),
        0,
      );
    }
  } catch (error) {
    logger.warn("[profile] Credit usage query failed", error);
  }

  return { chatsLast30d, tokensUsedLast7d };
}

/**
 * Load active (non-revoked) sessions for the user: count + recent rows for the profile aggregate.
 */
async function loadActiveSessions(userId: string) {
  try {
    const serviceClient = createServiceRoleClient();
    const { data, count } = await serviceClient
      .from("user_session")
      .select("id, issued_at, last_seen, ip, user_agent", { count: "exact" })
      .eq("user_id", userId)
      .eq("revoked", false)
      .order("issued_at", { ascending: false })
      .limit(5);

    const sessions = (data ?? []).map((row) => ({
      sessionId: row.id,
      device: parseDeviceFromUserAgent(row.user_agent),
      ipAddress: row.ip ?? null,
      createdAt: row.issued_at,
      lastSeenAt: row.last_seen ?? null,
    }));

    return { count: count ?? sessions.length, sessions };
  } catch {
    return { count: null as number | null, sessions: [] as Array<{ sessionId: string; device: string | null; ipAddress: string | null; createdAt: string; lastSeenAt: string | null }> };
  }
}

/**
 * Extract a human-friendly device description from a raw User-Agent string.
 */
function parseDeviceFromUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  // Quick heuristic: pick the first parenthesized substring
  const match = ua.match(/\(([^)]+)\)/);
  if (match?.[1]) {
    const parts = match[1].split(";").map((s) => s.trim());
    // Return the first two meaningful segments (OS + device)
    return parts.slice(0, 2).join(" / ");
  }
  // Fallback: first 60 chars
  return ua.length > 60 ? `${ua.slice(0, 57)}...` : ua;
}

/**
 * Derive passwordLastChangedAt from the Supabase auth user object.
 * Supabase stores password_hash metadata on the "email" identity.
 * The identity's `updated_at` approximates when the password was last changed.
 */
function derivePasswordLastChanged(user: { identities?: Array<{ provider: string; updated_at?: string; created_at?: string }> | null }): string | null {
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const emailIdentity = identities.find((id) => id.provider === "email");
  if (!emailIdentity) return null;
  // updated_at on the email identity reflects the last password change
  return emailIdentity.updated_at ?? emailIdentity.created_at ?? null;
}

const OPTIONAL_PROFILE_UPDATE_COLUMNS = [
  "display_name",
  "username",
  "bio",
  "locale",
  "time_zone",
  "avatar_url",
  "avatar_kind",
  "avatar_seed",
  "avatar_version",
  "metadata",
] as const;

type ProfileAvatarRecord = {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  avatar_kind?: string | null;
  avatar_seed?: string | null;
  avatar_version?: number | null;
  metadata?: Record<string, UntypedJson> | null;
};

function normalizeProfileString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function mergeMetadataRecord(
  current: UntypedJson,
  incoming: UntypedJson,
): UntypedJson {
  if (
    current &&
    typeof current === "object" &&
    !Array.isArray(current) &&
    incoming &&
    typeof incoming === "object" &&
    !Array.isArray(incoming)
  ) {
    return {
      ...(current as Record<string, UntypedJson>),
      ...(incoming as Record<string, UntypedJson>),
    };
  }

  if (incoming && typeof incoming === "object" && !Array.isArray(incoming)) {
    return incoming as Record<string, UntypedJson>;
  }

  return current;
}

function mergeProfileMetadata(
  currentMetadata: Record<string, UntypedJson> | null | undefined,
  nextMetadata: Record<string, unknown>,
): Record<string, UntypedJson> {
  const current = currentMetadata ? { ...currentMetadata } : {};
  const incoming = nextMetadata as Record<string, UntypedJson>;

  return {
    ...current,
    ...incoming,
    profile: mergeMetadataRecord(current.profile, incoming.profile),
    preferences: mergeMetadataRecord(current.preferences, incoming.preferences),
  };
}

function resolvePersistedAvatarSeed({
  userId,
  currentSeed,
  username,
  displayName,
}: {
  userId: string;
  currentSeed?: string | null;
  username?: string | null;
  displayName?: string | null;
}): string {
  return (
    normalizeAvatarSeed({ username: currentSeed }) ??
    normalizeAvatarSeed({ username }) ??
    normalizeAvatarSeed({ username: displayName }) ??
    `user-${userId}`
  );
}

function buildProfileAvatarFields(
  userId: string,
  currentProfile: ProfileAvatarRecord | null,
  updates: z.infer<typeof UpdateProfileSchema>,
): Pick<Record<string, UntypedJson>, "avatar_kind" | "avatar_seed" | "avatar_version"> {
  const nextAvatarUrl =
    updates.avatarUrl !== undefined
      ? normalizeProfileString(updates.avatarUrl)
      : normalizeProfileString(currentProfile?.avatar_url);
  const nextUsername =
    updates.username !== undefined
      ? normalizeProfileString(updates.username)
      : normalizeProfileString(currentProfile?.username);
  const nextDisplayName =
    updates.displayName !== undefined
      ? normalizeProfileString(updates.displayName)
      : normalizeProfileString(currentProfile?.display_name);

  return {
    avatar_kind: nextAvatarUrl ? "uploaded" : "generated",
    avatar_seed: resolvePersistedAvatarSeed({
      userId,
      currentSeed: currentProfile?.avatar_seed,
      username: nextUsername,
      displayName: nextDisplayName,
    }),
    avatar_version:
      typeof currentProfile?.avatar_version === "number" &&
      Number.isFinite(currentProfile.avatar_version)
        ? currentProfile.avatar_version
        : AVATAR_V1_VERSION,
  };
}

type ProfileUpsertError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

function isMissingProfileColumnError(error: ProfileUpsertError | null | undefined) {
  if (!error) return false;
  const code = typeof error.code === "string" ? error.code : "";
  if (code === "42703" || code === "PGRST204") return true;
  const message = [error.message, error.details, error.hint]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  return /column/i.test(message) && /(not exist|could not find)/i.test(message);
}

function extractMissingProfileColumn(error: ProfileUpsertError): string | null {
  const message = [error.message, error.details, error.hint]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  const quoted = message.match(/'([a-zA-Z0-9_]+)'/);
  if (quoted?.[1]) {
    return quoted[1];
  }

  const prefixed = message.match(/profiles\.([a-zA-Z0-9_]+)/i);
  if (prefixed?.[1]) {
    return prefixed[1];
  }

  const generic = message.match(/column\s+"?([a-zA-Z0-9_]+)"?/i);
  if (generic?.[1]) {
    return generic[1];
  }

  return null;
}

function dropUnsupportedProfileColumns(
  payload: Record<string, UntypedJson>,
  missingColumn: string | null,
) {
  const dropped: string[] = [];

  if (
    missingColumn &&
    missingColumn in payload &&
    OPTIONAL_PROFILE_UPDATE_COLUMNS.includes(
      missingColumn as (typeof OPTIONAL_PROFILE_UPDATE_COLUMNS)[number],
    )
  ) {
    delete payload[missingColumn];
    dropped.push(missingColumn);
    return dropped;
  }

  for (const candidate of OPTIONAL_PROFILE_UPDATE_COLUMNS) {
    if (!(candidate in payload)) {
      continue;
    }
    delete payload[candidate];
    dropped.push(candidate);
  }

  return dropped;
}

async function loadCurrentProfileAvatarRecord(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileAvatarRecord | null> {
  const latest = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, avatar_kind, avatar_seed, avatar_version, metadata")
    .eq("id", userId)
    .maybeSingle();

  if (!latest.error) {
    return (latest.data as ProfileAvatarRecord | null) ?? null;
  }

  if (!isMissingProfileColumnError(latest.error)) {
    return null;
  }

  const legacy = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, metadata")
    .eq("id", userId)
    .maybeSingle();

  if (legacy.error) {
    return null;
  }

  return (legacy.data as ProfileAvatarRecord | null) ?? null;
}

async function upsertProfileWithSchemaFallback(
  supabase: SupabaseClient,
  userId: string,
  updatePayload: Record<string, UntypedJson>,
) {
  const payload: Record<string, UntypedJson> = {
    id: userId,
    ...updatePayload,
  };
  const droppedColumns = new Set<string>();
  const maxAttempts = OPTIONAL_PROFILE_UPDATE_COLUMNS.length + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await supabase
      .from("profiles")
      .upsert({ ...payload })
      .select()
      .single();
    if (!result.error) {
      return { ...result, droppedColumns: Array.from(droppedColumns) };
    }

    if (!isMissingProfileColumnError(result.error)) {
      return { ...result, droppedColumns: Array.from(droppedColumns) };
    }

    const missingColumn = extractMissingProfileColumn(result.error);
    const dropped = dropUnsupportedProfileColumns(payload, missingColumn);
    if (dropped.length === 0) {
      return { ...result, droppedColumns: Array.from(droppedColumns) };
    }

    for (const column of dropped) {
      droppedColumns.add(column);
    }
  }

  return {
    data: null,
    error: {
      code: "PROFILE_UPSERT_RETRY_EXHAUSTED",
      message: "Profile update failed after schema fallback retries",
    },
    droppedColumns: Array.from(droppedColumns),
  };
}

export async function GET() {
  return timeApiRoute("profile.get", async () => {
    try {
      const supabase = await createClient();
      if (!supabase) {
        return apiResponse.serviceUnavailable("Database unavailable");
      }

      const { value: authResult, timedOut: authTimedOut } =
        await withTimeoutFallbackResult(supabase.auth.getUser(), {
          timeoutMs: 15000,
          scope: "profile_auth_user",
          fallback: () => ({
            data: { user: null },
            error: new AuthApiError("Auth timeout", 408, "auth_timeout"),
          }),
        });

      const {
        data: { user },
        error: authError,
      } = authResult;

      if (authTimedOut || authError?.status === 408) {
        const response = apiResponse.serviceUnavailable(
          "Auth session temporarily unavailable",
        );
        response.headers.set("Retry-After", "2");
        return response;
      }

      if (authError || !user) {
        return apiResponse.unauthorized();
      }

      // Fetch profile data, wallets, MFA status, usage stats, sessions, and artifacts in parallel
      const [profileResult, wallets, ensName, mfaStatus, usageStats, sessionData, artifactSummary] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single(),
          user?.id ? loadWalletPortfolios(user.id) : Promise.resolve([]),
          getActiveEnsNameForUser(user.id),
          loadMfaStatus(user.id),
          loadUsageStats(user.id, supabase),
          loadActiveSessions(user.id),
          loadUserArtifactSummary(user.id),
        ]);

      const { data: profile, error: profileError } = profileResult;

      const passwordLastChangedAt = derivePasswordLastChanged(user as { identities?: Array<{ provider: string; updated_at?: string; created_at?: string }> | null });

      const securityPayload = {
        mfaEnabled: mfaStatus.mfaEnabled,
        passwordLastChangedAt,
        lastLoginAt: user.last_sign_in_at,
        activeSessionCount: sessionData.count,
      };

      const usagePayload = {
        chatsLast30d: usageStats.chatsLast30d,
        artifactsLast30d: artifactSummary.artifactsLast30d,
        tokensPromptLast7d: usageStats.tokensUsedLast7d,
        tokensCompletionLast7d: 0,
      };

      if (profileError) {
        // Profile doesn't exist yet - return derived data from auth
        const metadata = user.user_metadata ?? {};
        const profileMeta = (metadata.profile ?? {}) as Record<
          string,
          UntypedJson
        >;

        return apiResponse.success({
          identity: {
            userId: 0,
            email: user.email,
            emailVerified: !!user.email_confirmed_at,
            emailVerifiedAt: user.email_confirmed_at,
            displayName: metadata.full_name ?? metadata.name ?? null,
            ensName,
            username: metadata.username ?? metadata.preferred_username ?? null,
            avatarUrl: metadata.avatar_url ?? metadata.picture ?? null,
            avatarSeed: resolvePersistedAvatarSeed({
              userId: user.id,
              username:
                typeof metadata.username === "string"
                  ? metadata.username
                  : typeof metadata.preferred_username === "string"
                    ? metadata.preferred_username
                    : null,
              displayName:
                typeof metadata.full_name === "string"
                  ? metadata.full_name
                  : typeof metadata.name === "string"
                    ? metadata.name
                    : null,
            }),
            avatarKind:
              typeof metadata.avatar_url === "string" || typeof metadata.picture === "string"
                ? "uploaded"
                : "generated",
            avatarVersion: AVATAR_V1_VERSION,
            locale: profileMeta.locale ?? null,
            timeZone: profileMeta.timeZone ?? null,
            bio: profileMeta.bio ?? null,
            metadata: profileMeta,
          },
          security: securityPayload,
          usage: usagePayload,
          wallets,
          sessions: sessionData.sessions,
          artifacts: artifactSummary.artifacts,
          bio: profileMeta.bio ?? null,
          locale: profileMeta.locale ?? null,
        });
      }

      return apiResponse.success({
        identity: {
          userId: 0,
          email: user.email,
          emailVerified: !!user.email_confirmed_at,
          emailVerifiedAt: user.email_confirmed_at,
          displayName: profile.display_name,
          ensName,
          username: profile.username,
          avatarUrl: profile.avatar_url,
          avatarSeed: normalizeProfileString(profile.avatar_seed) ??
            resolvePersistedAvatarSeed({
              userId: user.id,
              username: profile.username,
              displayName: profile.display_name,
            }),
          avatarKind:
            normalizeProfileString(profile.avatar_kind) === "uploaded" ? "uploaded" : "generated",
          avatarVersion:
            typeof profile.avatar_version === "number" && Number.isFinite(profile.avatar_version)
              ? profile.avatar_version
              : AVATAR_V1_VERSION,
          locale: profile.locale,
          timeZone: profile.time_zone,
          bio: profile.bio,
          metadata: profile.metadata,
        },
        security: securityPayload,
        usage: usagePayload,
        wallets,
        sessions: sessionData.sessions,
        artifacts: artifactSummary.artifacts,
        bio: profile.bio,
        locale: profile.locale,
      });
    } catch (error) {
      logger.error("[API] Profile GET error:", error);
      return apiResponse.internalError("Failed to fetch profile");
    }
  });
}

export async function PATCH(request: NextRequest) {
  return timeApiRoute("profile.update", async () => {
    try {
      const supabase = await createClient();
      if (!supabase) {
        return apiResponse.serviceUnavailable("Database unavailable");
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return apiResponse.unauthorized();
      }

      const body = await request.json();
      const parsed = UpdateProfileSchema.safeParse(body);
      if (!parsed.success) {
        return apiResponse.validationError(parsed.error);
      }

      const updates = parsed.data;
      const currentProfile = await loadCurrentProfileAvatarRecord(supabase, user.id);

      // Check username uniqueness if being updated
      if (updates.username) {
        const nextUsername = updates.username.trim().toLowerCase();
        const currentUsername =
          typeof currentProfile?.username === "string"
            ? currentProfile.username.trim().toLowerCase()
            : "";

        if (nextUsername !== currentUsername && (await hasActiveEnsSubname(user.id))) {
          return apiResponse.error(
            "USERNAME_LOCKED",
            "Username is locked after your ENS subname is claimed.",
            409,
          );
        }

        const availability = await isEnsSubnameLabelAvailable({
          userId: user.id,
          label: nextUsername,
        });

        if (!availability.available) {
          return apiResponse.error(
            "USERNAME_TAKEN",
            availability.reason ?? "Username is already taken",
            409,
          );
        }

        updates.username = availability.normalizedLabel;
      }

      // Build update payload
      const updatePayload: Record<string, UntypedJson> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.displayName !== undefined) {
        updatePayload.display_name = updates.displayName;
      }
      if (updates.username !== undefined) {
        updatePayload.username = updates.username;
      }
      if (updates.bio !== undefined) {
        updatePayload.bio = updates.bio;
      }
      if (updates.locale !== undefined) {
        updatePayload.locale = updates.locale;
      }
      if (updates.timeZone !== undefined) {
        updatePayload.time_zone = updates.timeZone;
      }
      if (updates.avatarUrl !== undefined) {
        updatePayload.avatar_url = updates.avatarUrl;
      }
      if (updates.elevenlabsVoiceId !== undefined) {
        updatePayload.elevenlabs_voice_id = updates.elevenlabsVoiceId;
      }
      if (updates.metadata !== undefined) {
        updatePayload.metadata = mergeProfileMetadata(
          currentProfile?.metadata,
          updates.metadata,
        );
      }
      const avatarFields = buildProfileAvatarFields(user.id, currentProfile, updates);
      Object.assign(updatePayload, avatarFields);

      // Upsert profile (creates if doesn't exist), with legacy-schema fallback.
      const {
        data: profile,
        error: updateError,
        droppedColumns,
      } = await upsertProfileWithSchemaFallback(supabase, user.id, updatePayload);

      if (droppedColumns.length > 0) {
        logger.warn("[API] Profile update applied schema fallback", {
          userId: user.id,
          droppedColumns,
        });
      }

      if (updateError) {
        logger.error("[API] Profile update error:", updateError);
        return apiResponse.internalError("Failed to update profile");
      }

      // Invalidate Redis-cached profile aggregate so subsequent reads get fresh data
      await invalidateProfileAggregate(user.id).catch((err) => {
        logger.warn("[API] Failed to invalidate profile cache after update", err);
      });

      const profileRecord = (profile ?? {}) as Record<string, UntypedJson>;

      return apiResponse.success({
        success: true,
        profile: {
          id: (profileRecord.id as string | undefined) ?? user.id,
          displayName:
            (profileRecord.display_name as string | null | undefined) ??
            updates.displayName ??
            null,
          username:
            (profileRecord.username as string | null | undefined) ??
            updates.username ??
            null,
          bio:
            (profileRecord.bio as string | null | undefined) ??
            updates.bio ??
            null,
          locale:
            (profileRecord.locale as string | null | undefined) ??
            updates.locale ??
            null,
          timeZone:
            (profileRecord.time_zone as string | null | undefined) ??
            updates.timeZone ??
            null,
          avatarUrl:
            (profileRecord.avatar_url as string | null | undefined) ??
            updates.avatarUrl ??
            null,
          avatarSeed:
            (profileRecord.avatar_seed as string | null | undefined) ??
            (avatarFields.avatar_seed as string),
          avatarKind:
            ((profileRecord.avatar_kind as string | null | undefined) ?? avatarFields.avatar_kind) ===
            "uploaded"
              ? "uploaded"
              : "generated",
          avatarVersion:
            (profileRecord.avatar_version as number | null | undefined) ??
            AVATAR_V1_VERSION,
          metadata:
            (profileRecord.metadata as Record<string, UntypedJson> | null | undefined) ??
            updates.metadata ??
            null,
          updatedAt:
            (profileRecord.updated_at as string | undefined) ??
            updatePayload.updated_at,
        },
      });
    } catch (error) {
      logger.error("[API] Profile PATCH error:", error);
      return apiResponse.internalError("Failed to update profile");
    }
  });
}
