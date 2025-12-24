import "server-only";

import crypto from "crypto";
import { getNexisApiBaseUrl, getNexisApiVersion } from "@/lib/server/nexis-cloud";

export type ApiKeyView = {
  id: string;
  label: string;
  prefix: string;
  createdAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdBy: string | null;
};

type ApiKeyServiceConfig = {
  baseUrl: string;
  versionHeader: string | null;
};

type ApiKeyServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

function resolveApiKeyServiceConfig(): ApiKeyServiceConfig {
  const override = process.env.NEXIS_API_KEYS_API_URL;
  if (override) {
    return { baseUrl: override.replace(/\/$/, ""), versionHeader: null };
  }
  const baseUrl = `${getNexisApiBaseUrl().replace(/\/$/, "")}/account/tokens`;
  return { baseUrl, versionHeader: getNexisApiVersion() };
}

function buildApiKeyUrl(baseUrl: string, path?: string) {
  if (!path) return baseUrl;
  const cleaned = path.replace(/^\/+/, "");
  return `${baseUrl}/${cleaned}`;
}

function toString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function toNullableString(value: unknown): string | null {
  const out = toString(value);
  return out;
}

function normalizeApiKeyRecord(raw: unknown): ApiKeyView | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const label =
    toString(obj.label) ||
    toString(obj.name) ||
    toString(obj.title) ||
    toString(obj.description) ||
    "API key";
  const prefix =
    toString(obj.prefix) ||
    toString(obj.key_prefix) ||
    toString(obj.token_prefix) ||
    toString(obj.api_key_prefix) ||
    (toString(obj.token) ? toString(obj.token)?.slice(0, 10) ?? "" : "") ||
    (toString(obj.key) ? toString(obj.key)?.slice(0, 10) ?? "" : "");
  const id =
    toString(obj.id) ||
    toString(obj.token_id) ||
    toString(obj.key_id) ||
    toString(obj.uuid) ||
    toString(obj.tokenId) ||
    toString(obj.keyId) ||
    prefix ||
    crypto.randomUUID();

  return {
    id,
    label,
    prefix: prefix || id.slice(0, 10),
    createdAt: toNullableString(obj.createdAt ?? obj.created_at ?? obj.created) ?? null,
    lastUsedAt: toNullableString(obj.lastUsedAt ?? obj.last_used_at ?? obj.last_used) ?? null,
    revokedAt: toNullableString(obj.revokedAt ?? obj.revoked_at ?? obj.revoked) ?? null,
    createdBy: toNullableString(obj.createdBy ?? obj.created_by ?? obj.owner ?? obj.user_id) ?? null,
  };
}

function extractKeyItems(payload: unknown): ApiKeyView[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizeApiKeyRecord).filter(Boolean) as ApiKeyView[];
  }
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const candidates = [obj.items, obj.data, obj.tokens, obj.keys, obj.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map(normalizeApiKeyRecord).filter(Boolean) as ApiKeyView[];
    }
  }
  return [];
}

function extractSecret(payload: unknown): string | null {
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  if (typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  return (
    toString(obj.secret) ||
    toString(obj.token) ||
    toString(obj.api_key) ||
    toString(obj.key) ||
    toString(obj.value) ||
    toString(obj.plaintext)
  );
}

function extractKey(payload: unknown): ApiKeyView | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const candidate =
    obj.key ??
    obj.token ??
    obj.data ??
    obj.item ??
    obj.result ??
    obj;
  return normalizeApiKeyRecord(candidate);
}

async function requestApiKeys<T>(
  apiKey: string,
  options: {
    method?: string;
    path?: string;
    body?: unknown;
  } = {},
): Promise<ApiKeyServiceResult<T>> {
  const config = resolveApiKeyServiceConfig();
  const url = buildApiKeyUrl(config.baseUrl, options.path);
  const headers: Record<string, string> = {
    "X-API-Key": apiKey,
    Accept: "application/json",
  };
  if (config.versionHeader) {
    headers["X-Phala-Version"] = config.versionHeader;
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body,
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    if (!response.ok) {
      return {
        ok: false,
        error: typeof data === "string" ? data : `Request failed (${response.status})`,
        status: response.status,
      };
    }
    return { ok: true, data: data as T };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to reach API key service.",
    };
  }
}

export async function listApiKeys(apiKey: string): Promise<ApiKeyServiceResult<ApiKeyView[]>> {
  const result = await requestApiKeys<unknown>(apiKey);
  if (!result.ok) return result;
  return { ok: true, data: extractKeyItems(result.data) };
}

export async function createApiKey(
  apiKey: string,
  label: string,
): Promise<ApiKeyServiceResult<{ key: ApiKeyView | null; secret: string | null }>> {
  const result = await requestApiKeys<unknown>(apiKey, {
    method: "POST",
    body: { label, name: label },
  });
  if (!result.ok) return result;
  return {
    ok: true,
    data: {
      key: extractKey(result.data),
      secret: extractSecret(result.data),
    },
  };
}

export async function revokeApiKey(
  apiKey: string,
  id: string,
): Promise<ApiKeyServiceResult<{ key: ApiKeyView | null }>> {
  const primary = await requestApiKeys<unknown>(apiKey, {
    method: "DELETE",
    path: id,
  });
  if (primary.ok) {
    return { ok: true, data: { key: extractKey(primary.data) } };
  }

  if (primary.status && primary.status !== 404 && primary.status !== 405) {
    return primary as ApiKeyServiceResult<{ key: ApiKeyView | null }>;
  }

  const fallback = await requestApiKeys<unknown>(apiKey, {
    method: "DELETE",
    body: { id },
  });
  if (!fallback.ok) return fallback as ApiKeyServiceResult<{ key: ApiKeyView | null }>;
  return { ok: true, data: { key: extractKey(fallback.data) } };
}
