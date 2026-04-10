import { getErrorMessage } from "@/lib/utils/error";
import { isJsonObject } from "@/lib/utils/request";
import { getSupabaseConfig } from "@/lib/supabase/config";


import { logger } from '@/lib/logger';
export type SupabaseTokenClaims = Record<string, UntypedJson> & {
  sub?: string;
  user_id?: string;
  userId?: string;
  id?: string;
  email?: string;
  user_email?: string;
  email_verified?: UntypedJson;
  email_confirmed?: UntypedJson;
  email_confirmed_at?: UntypedJson;
  confirmed_at?: UntypedJson;
  provider?: string;
  session_id?: string;
  iat?: number;
  exp?: number;
  role?: string | string[];
  roles?: UntypedJson;
  app_metadata?: UntypedJson;
  user_metadata?: UntypedJson;
};

export type SupabaseSessionRecord = {
  id: string;
  provider: string;
  user: Record<string, UntypedJson>;
  token: {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in?: number;
  };
  metadata: Record<string, UntypedJson>;
};

export type SupabaseAuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  session: SupabaseStoredSession | null;
};

type SupabaseStoredSession = Record<string, UntypedJson> & {
  access_token?: UntypedJson;
  refresh_token?: UntypedJson;
  expires_at?: UntypedJson;
  expires_in?: UntypedJson;
  token_type?: UntypedJson;
  user?: UntypedJson;
};

type CookieLike = {
  getAll(): Array<{ name: string; value: string }>;
};

const SUPABASE_ACCESS_COOKIE = "sb-access-token";
const SUPABASE_REFRESH_COOKIE = "sb-refresh-token";
const STORAGE_BASE64_PREFIX = "base64-";

let cachedStorageKey: string | null | undefined;

/**
 * Reset the cached storage key. Used for testing.
 */
export function resetSupabaseAuthStorageKeyCache(): void {
  cachedStorageKey = undefined;
}

function extractProjectRefFromToken(token: string | undefined): string | null {
  if (!token) {
    return null;
  }

  const normalized = token.trim();
  if (normalized.length === 0 || !normalized.includes(".")) {
    return null;
  }

  const claims = decodeJwtPayload(normalized);
  const rawRef = claims?.ref;
  if (typeof rawRef === "string" && rawRef.trim().length > 0) {
    return rawRef.trim();
  }

  return null;
}

function extractProjectRefFromUrl(candidate: string | undefined): string | null {
  if (!candidate) {
    return null;
  }

  try {
    const normalized =
      candidate.startsWith("http://") || candidate.startsWith("https://")
        ? candidate
        : `https://${candidate}`;
    const hostname = new URL(normalized).hostname.toLowerCase();
    const labels = hostname.split(".");
    if (labels.length === 0) {
      return null;
    }

    // Canonical project URL: <project_ref>.supabase.co
    if (hostname.endsWith(".supabase.co")) {
      if (labels[0] === "auth" && labels.length >= 4) {
        return labels[1] ?? null;
      }
      return labels[0] ?? null;
    }

    // Avoid treating vanity auth subdomains like auth.nex-t1.ai as project refs.
    if (labels[0] === "auth") {
      return null;
    }

    return labels[0] ?? null;
  } catch {
    return null;
  }
}

export function getSupabaseAuthStorageKey(): string | null {
  if (cachedStorageKey !== undefined) {
    return cachedStorageKey;
  }

  const config = getSupabaseConfig();
  const candidateTokens: Array<string | undefined> = [
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_OR_ANON_KEY,
  ];
  const candidateUrls: Array<string | undefined> = [
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
    process.env.SUPABASE_PROJECT_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL,
    config?.url,
  ];

  for (const candidate of candidateUrls) {
    const projectRef = extractProjectRefFromUrl(candidate);
    if (projectRef) {
      cachedStorageKey = `sb-${projectRef}-auth-token`;
      return cachedStorageKey;
    }
  }

  for (const token of candidateTokens) {
    const projectRef = extractProjectRefFromToken(token);
    if (projectRef) {
      cachedStorageKey = `sb-${projectRef}-auth-token`;
      return cachedStorageKey;
    }
  }

  cachedStorageKey = null;
  return cachedStorageKey;
}

export function extractSupabaseAuthState({
  cookieJar,
  request,
}: {
  cookieJar: CookieLike;
  request?: Request | null;
}): SupabaseAuthState {
  const cookieMap = buildCookieMap(cookieJar.getAll());
  const storedSession = readStoredSessionFromCookies(cookieMap);
  const headerToken = extractBearerToken(request);
  const headerSupabase = coerceTokenString(request?.headers?.get("x-supabase-auth"));
  const sessionToken = coerceTokenString(storedSession?.access_token);
  const legacyCookieToken = coerceTokenString(cookieMap.get(SUPABASE_ACCESS_COOKIE));
  const accessToken = headerToken ?? headerSupabase ?? sessionToken ?? legacyCookieToken ?? null;
  const refreshToken =
    coerceTokenString(storedSession?.refresh_token) ??
    coerceTokenString(cookieMap.get(SUPABASE_REFRESH_COOKIE)) ??
    null;

  return { accessToken, refreshToken, session: storedSession };
}

export function decodeJwtPayload(token: string): SupabaseTokenClaims | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  const base64 = parts[1];
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
  const padded = normalized + "=".repeat(padding);

  try {
    if (typeof Buffer !== "undefined") {
      const json = Buffer.from(padded, "base64").toString("utf8");
      return JSON.parse(json) as SupabaseTokenClaims;
    }
    if (typeof atob !== "undefined" && typeof TextDecoder !== "undefined") {
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(bytes)) as SupabaseTokenClaims;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.error("decodeJwtPayload_failed", getErrorMessage(error, ""));
    }
  }

  return null;
}

export function buildSupabaseSessionRecord(
  token: string,
  claims: SupabaseTokenClaims,
  storedSession: SupabaseStoredSession | null,
  userId: string,
): SupabaseSessionRecord | null {
  const storedUser = isJsonObject(storedSession?.user)
    ? (storedSession?.user as Record<string, UntypedJson>)
    : null;

  const userMetadataFromClaims = isJsonObject(claims.user_metadata)
    ? (claims.user_metadata as Record<string, UntypedJson>)
    : null;
  const appMetadataFromClaims = isJsonObject(claims.app_metadata)
    ? (claims.app_metadata as Record<string, UntypedJson>)
    : null;

  const email = extractEmailFromClaims(claims);
  const emailVerified = extractEmailVerified(claims, userMetadataFromClaims);
  const createdAt = coerceStringValue(claims["created_at"] ?? claims["user_created_at"]);
  const lastSignInAt = coerceStringValue(claims["last_sign_in_at"] ?? claims["user_last_sign_in_at"]);
  const sessionId = coerceStringValue(claims.session_id);

  const userRecord: Record<string, UntypedJson> = storedUser
    ? {
        ...storedUser,
        id: coerceStringValue((storedUser as Record<string, UntypedJson>).id) ?? userId,
        user_id: coerceStringValue((storedUser as Record<string, UntypedJson>).user_id) ?? userId,
        email: coerceStringValue((storedUser as Record<string, UntypedJson>).email) ?? email ?? null,
      }
    : {
        id: userId,
        user_id: userId,
        email: email ?? null,
        email_verified: emailVerified ?? null,
        emailVerified,
        created_at: createdAt ?? null,
        last_sign_in_at: lastSignInAt ?? null,
        metadata: userMetadataFromClaims,
        user_metadata: userMetadataFromClaims,
        app_metadata: appMetadataFromClaims,
      };

  if (!userRecord.metadata && userMetadataFromClaims) {
    userRecord.metadata = userMetadataFromClaims;
  }
  if (!userRecord.user_metadata && userMetadataFromClaims) {
    userRecord.user_metadata = userMetadataFromClaims;
  }
  if (!userRecord.app_metadata && appMetadataFromClaims) {
    userRecord.app_metadata = appMetadataFromClaims;
  }

  if (emailVerified !== undefined && userRecord.email_verified == null) {
    userRecord.email_verified = emailVerified;
  }
  if (emailVerified !== undefined && (userRecord as Record<string, UntypedJson>).emailVerified == null) {
    (userRecord as Record<string, UntypedJson>).emailVerified = emailVerified;
  }
  if (createdAt && userRecord.created_at == null) {
    userRecord.created_at = createdAt;
  }
  if (lastSignInAt && userRecord.last_sign_in_at == null) {
    userRecord.last_sign_in_at = lastSignInAt;
  }

  const expiresAtSeconds = typeof claims.exp === "number" ? claims.exp : undefined;
  const issuedAtSeconds = typeof claims.iat === "number" ? claims.iat : undefined;
  const expiresInFromClaims =
    typeof expiresAtSeconds === "number" && typeof issuedAtSeconds === "number"
      ? Math.max(expiresAtSeconds - issuedAtSeconds, 0)
      : undefined;

  const expiresIn =
    typeof storedSession?.expires_in === "number" && Number.isFinite(storedSession.expires_in)
      ? storedSession.expires_in
      : expiresInFromClaims;

  const providerFromSession = coerceStringValue(
    isJsonObject(storedSession?.user)
      ? ((storedSession?.user as Record<string, UntypedJson>).app_metadata as Record<string, UntypedJson> | undefined)?.provider
      : undefined,
  );

  return {
    id: sessionId ?? `supabase_session_${userId}`,
    provider: providerFromSession ?? coerceStringValue(claims.provider) ?? "supabase",
    user: userRecord,
    token: {
      access_token: token,
      refresh_token: coerceTokenString(storedSession?.refresh_token) ?? undefined,
      token_type: coerceStringValue(storedSession?.token_type) ?? "bearer",
      expires_in: expiresIn,
    },
    metadata: {
      source: "supabase",
      roles: extractRolesFromClaims(claims),
      app_metadata: appMetadataFromClaims,
      user_metadata: userMetadataFromClaims,
    },
  };
}

export function extractUserIdFromClaims(claims: SupabaseTokenClaims): string | undefined {
  const candidates = [claims.sub, claims.user_id, claims.userId, claims.id];
  for (const candidate of candidates) {
    const resolved = coerceUserId(candidate);
    if (resolved) {
      return resolved;
    }
  }
  return undefined;
}

export function extractEmailFromClaims(claims: SupabaseTokenClaims): string | null {
  const candidates = [claims.email, claims.user_email];
  for (const candidate of candidates) {
    const value = coerceStringValue(candidate);
    if (value && value.includes("@")) {
      return value;
    }
  }
  return null;
}

export function extractRolesFromClaims(claims: SupabaseTokenClaims): readonly string[] {
  const roles: string[] = [];

  const pushRole = (value: UntypedJson) => {
    if (typeof value === "string" && value.trim().length > 0) {
      roles.push(value.trim());
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === "string" && entry.trim().length > 0) {
          roles.push(entry.trim());
        }
      }
    }
  };

  pushRole(claims.role);
  pushRole(claims.roles);

  if (isJsonObject(claims.app_metadata)) {
    const appMetadata = claims.app_metadata as Record<string, UntypedJson>;
    pushRole(appMetadata.role);
    pushRole(appMetadata.roles);
  }

  return roles;
}

export function extractEmailVerified(
  claims: SupabaseTokenClaims,
  userMetadataFromClaims: Record<string, UntypedJson> | null,
): boolean | null {
  const candidateKeys = [
    claims.email_verified,
    claims.email_confirmed,
    claims.email_confirmed_at,
    claims.confirmed_at,
    userMetadataFromClaims?.email_verified,
    userMetadataFromClaims?.email_confirmed,
  ];

  for (const candidate of candidateKeys) {
    if (typeof candidate === "boolean") {
      return candidate;
    }
    if (typeof candidate === "string") {
      const normalized = candidate.trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
    }
  }
  return null;
}

function buildCookieMap(entries: Array<{ name: string; value: string }>) {
  const map = new Map<string, string>();
  entries.forEach(({ name, value }) => {
    if (typeof name === "string" && typeof value === "string") {
      map.set(name, value);
    }
  });
  return map;
}

function coerceTokenString(value: UntypedJson): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function extractBearerToken(request: Request | null | undefined): string | null {
  const headerAuth = request?.headers?.get("authorization");
  if (!headerAuth) return null;
  if (!headerAuth.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return coerceTokenString(headerAuth.slice(7));
}

function readStoredSessionFromCookies(cookieMap: Map<string, string>): SupabaseStoredSession | null {
  const storageKey = getSupabaseAuthStorageKey();
  if (!storageKey) {
    return null;
  }
  const rawSession = decodeStorageValue(readChunkedCookieValue(cookieMap, storageKey));
  const sessionRecord = parseJsonRecord(rawSession);
  if (!sessionRecord) {
    return null;
  }

  if (!sessionRecord.user) {
    const userPayload = decodeStorageValue(readChunkedCookieValue(cookieMap, `${storageKey}-user`));
    const parsedUserContainer = parseJsonRecord(userPayload);
    if (parsedUserContainer && isJsonObject(parsedUserContainer.user)) {
      sessionRecord.user = parsedUserContainer.user;
    }
  }

  return sessionRecord as SupabaseStoredSession;
}

function readChunkedCookieValue(cookieMap: Map<string, string>, baseName: string | null): string | null {
  if (!baseName) {
    return null;
  }
  const direct = cookieMap.get(baseName);
  if (typeof direct === "string") {
    return direct;
  }

  const chunks: string[] = [];
  for (let index = 0; index < 50; index += 1) {
    const chunk = cookieMap.get(`${baseName}.${index}`);
    if (typeof chunk !== "string") {
      break;
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return null;
  }
  return chunks.join("");
}

function decodeStorageValue(value: string | null): string | null {
  if (!value) {
    return null;
  }
  if (value.startsWith(STORAGE_BASE64_PREFIX)) {
    const raw = value.slice(STORAGE_BASE64_PREFIX.length);
    const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
    try {
      return Buffer.from(normalized + "=".repeat(padding), "base64").toString("utf8");
    } catch {
      return null;
    }
  }
  return value;
}

function parseJsonRecord(value: string | null): Record<string, UntypedJson> | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    return isJsonObject(parsed) ? (parsed as Record<string, UntypedJson>) : null;
  } catch {
    return null;
  }
}

function coerceStringValue(value: UntypedJson): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function coerceUserId(value: UntypedJson): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}
