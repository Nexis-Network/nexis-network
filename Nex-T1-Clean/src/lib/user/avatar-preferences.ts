export type IconPreference = "polycon" | "jazzicon" | "blockies";

type IdentitySeedInput = {
  username?: string | null;
  displayName?: string | null;
  email?: string | null;
  userId?: number | string | null;
} | null | undefined;

const ICON_PREFERENCES: ReadonlySet<IconPreference> = new Set([
  "polycon",
  "jazzicon",
  "blockies",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asIconPreference(value: unknown): IconPreference | null {
  const candidate = normalizeNonEmptyString(value);
  if (!candidate) return null;
  if (candidate === "blockie") {
    return "blockies";
  }
  return ICON_PREFERENCES.has(candidate as IconPreference)
    ? (candidate as IconPreference)
    : null;
}

export function resolveIconPreferenceFromMetadata(
  metadata: unknown,
): IconPreference {
  if (!isRecord(metadata)) {
    return "polycon";
  }

  const direct = asIconPreference(metadata.iconPreference);
  if (direct) {
    return direct;
  }

  const profile = isRecord(metadata.profile) ? metadata.profile : null;
  const nested = asIconPreference(profile?.iconPreference);
  return nested ?? "polycon";
}

export function resolveUserAvatarSeed(
  identity: IdentitySeedInput,
  fallback = "anon",
): string {
  const username = normalizeNonEmptyString(identity?.username);
  if (username) return username;

  const displayName = normalizeNonEmptyString(identity?.displayName);
  if (displayName) return displayName;

  const email = normalizeNonEmptyString(identity?.email);
  if (email) return email;

  if (typeof identity?.userId === "number" && Number.isFinite(identity.userId)) {
    return `user-${identity.userId}`;
  }

  if (typeof identity?.userId === "string") {
    const userId = normalizeNonEmptyString(identity.userId);
    if (userId) return `user-${userId}`;
  }

  return fallback;
}

export function resolveCdpWalletAvatarSeed(
  address: string | null | undefined,
  userSeed: string,
  chain: "evm" | "solana",
): string {
  const normalizedAddress = normalizeNonEmptyString(address);
  if (normalizedAddress) {
    return normalizedAddress;
  }
  return `${userSeed}:cdp:${chain}`;
}
