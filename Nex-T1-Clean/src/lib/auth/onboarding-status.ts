const LEGACY_ONBOARDING_MIGRATION_CUTOFF_ISO = "2026-03-01T00:00:00.000Z";

function toTimestamp(value?: string | null): number | null {
  if (!value || typeof value !== "string") return null;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
}

/**
 * Users migrated before the Supabase Cloud cutover should not be blocked by
 * missing/incomplete profile onboarding flags.
 */
export function isLegacyMigratedUser(createdAt?: string | null): boolean {
  const createdAtTs = toTimestamp(createdAt);
  const cutoffTs = toTimestamp(LEGACY_ONBOARDING_MIGRATION_CUTOFF_ISO);
  if (createdAtTs === null || cutoffTs === null) return false;
  return createdAtTs < cutoffTs;
}

export function resolveOnboardingCompleted(params: {
  profileOnboardingCompleted?: boolean | null;
  userCreatedAt?: string | null;
}): boolean {
  if (params.profileOnboardingCompleted === true) return true;
  if (isLegacyMigratedUser(params.userCreatedAt)) return true;
  return false;
}

export { LEGACY_ONBOARDING_MIGRATION_CUTOFF_ISO };
