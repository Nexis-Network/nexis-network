const TRUTHY_VALUES = new Set(["1", "true", "yes", "on", "enabled"]);
const FALSY_VALUES = new Set(["0", "false", "no", "off", "disabled"]);

function normalize(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed.toLowerCase();
}

function parseBooleanEnv(value: string | undefined | null): boolean | undefined {
  const normalized = normalize(value);
  if (normalized === null) {
    return undefined;
  }
  if (TRUTHY_VALUES.has(normalized)) {
    return true;
  }
  if (FALSY_VALUES.has(normalized)) {
    return false;
  }
  return undefined;
}

export function resolveSupabaseAuthOnlyFlag(env: Record<string, string | undefined> = process.env): boolean {
  const publicEnv =
    parseBooleanEnv(env.NEXT_PUBLIC_AUTH_SUPABASE_ONLY) ??
    parseBooleanEnv(env.NEXT_PUBLIC_SUPABASE_AUTH_ONLY);

  if (typeof publicEnv === "boolean") {
    return publicEnv;
  }

  const serverEnv =
    parseBooleanEnv(env.AUTH_SUPABASE_ONLY) ??
    parseBooleanEnv(env.SUPABASE_AUTH_ONLY);

  if (typeof serverEnv === "boolean") {
    return serverEnv;
  }

  return true;
}

let cachedSupabaseOnly: boolean | null = null;

export function isSupabaseAuthOnly(): boolean {
  if (cachedSupabaseOnly === null) {
    cachedSupabaseOnly = resolveSupabaseAuthOnlyFlag();
  }
  return cachedSupabaseOnly;
}

export function __resetSupabaseAuthModeCacheForTests() {
  cachedSupabaseOnly = null;
}

