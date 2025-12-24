import "server-only";

import { sanitizeId } from "@/lib/server/local-store";
import {
  agentsFetch,
  buildAgentServiceHeaders,
  buildAgentsUrl,
  requireAgentsServiceBaseUrl,
  type AgentServiceAuth,
} from "@/lib/server/agents-service";

export type AgentConfigRecord = {
  appId: string;
  name: string;
  description: string | null;
  endpointUrl: string | null;
  model: string | null;
  requestFormat: "generic" | "openai";
  prompt: string | null;
  envSecrets: Record<string, string>;
  headerSecrets: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type AgentConfigView = Omit<
  AgentConfigRecord,
  "envSecrets" | "headerSecrets"
> & {
  envKeys: string[];
  headerKeys: string[];
};

type AgentConfigPayload = {
  config?: unknown;
};

function toString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function toSecretMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const obj = value as Record<string, unknown>;
  const entries: Record<string, string> = {};
  for (const [key, raw] of Object.entries(obj)) {
    if (!key) continue;
    if (typeof raw === "string") {
      entries[key] = raw;
    } else if (raw !== undefined && raw !== null) {
      entries[key] = String(raw);
    }
  }
  return entries;
}

function normalizeConfig(raw: unknown, fallbackAppId: string): AgentConfigRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const appId = toString(obj.appId) || toString(obj.app_id) || fallbackAppId;
  const name = toString(obj.name) || `Agent ${appId.slice(0, 6)}`;
  const envKeys = toStringArray(obj.envKeys ?? obj.env_keys);
  const headerKeys = toStringArray(obj.headerKeys ?? obj.header_keys);
  let envSecrets = toSecretMap(obj.envSecrets ?? obj.env_secrets ?? obj.envs);
  let headerSecrets = toSecretMap(obj.headerSecrets ?? obj.header_secrets ?? obj.headers);

  if (envKeys.length > 0 && Object.keys(envSecrets).length === 0) {
    envSecrets = Object.fromEntries(envKeys.map((key) => [key, ""]));
  }
  if (headerKeys.length > 0 && Object.keys(headerSecrets).length === 0) {
    headerSecrets = Object.fromEntries(headerKeys.map((key) => [key, ""]));
  }

  const now = new Date().toISOString();
  const rawRequestFormat = obj.requestFormat ?? obj.request_format;
  return {
    appId,
    name,
    description: toString(obj.description) ?? null,
    endpointUrl: toString(obj.endpointUrl ?? obj.endpoint_url) ?? null,
    model: toString(obj.model) ?? null,
    requestFormat: rawRequestFormat === "openai" ? "openai" : "generic",
    prompt: toString(obj.prompt) ?? null,
    envSecrets,
    headerSecrets,
    createdAt: toString(obj.createdAt ?? obj.created_at) ?? now,
    updatedAt: toString(obj.updatedAt ?? obj.updated_at) ?? now,
  };
}

function normalizeConfigPayload(data: unknown, fallbackAppId: string): AgentConfigRecord | null {
  if (!data || typeof data !== "object") {
    return normalizeConfig(data, fallbackAppId);
  }
  const obj = data as Record<string, unknown>;
  if (obj.config) {
    return normalizeConfig(obj.config, fallbackAppId);
  }
  if (obj.data && typeof obj.data === "object" && obj.data !== null) {
    const nested = obj.data as AgentConfigPayload;
    if (nested.config) {
      return normalizeConfig(nested.config, fallbackAppId);
    }
    return normalizeConfig(obj.data, fallbackAppId);
  }
  return normalizeConfig(data, fallbackAppId);
}

function extractConfigItems(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  const candidates = [
    obj.items,
    obj.data,
    obj.agents,
    obj.configs,
    obj.results,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

async function fetchConfigWithFallback(
  appId: string,
  auth?: AgentServiceAuth,
): Promise<AgentConfigRecord | null> {
  const baseUrl = requireAgentsServiceBaseUrl();
  const headers = buildAgentServiceHeaders(auth);
  const encoded = encodeURIComponent(appId);
  const paths = [
    `config?appId=${encoded}`,
    `configs/${encoded}`,
    `agents/${encoded}/config`,
    `${encoded}/config`,
  ];

  let lastError: string | null = null;
  for (const path of paths) {
    const url = buildAgentsUrl(baseUrl, path);
    const result = await agentsFetch(url, { headers });
    if (result.ok) {
      return normalizeConfigPayload(result.data, appId);
    }
    if (result.status !== 404 && result.status !== 405) {
      lastError =
        typeof result.data === "string"
          ? result.data
          : `Request failed (${result.status})`;
      break;
    }
    lastError = `Request failed (${result.status})`;
  }

  if (lastError) {
    throw new Error(lastError);
  }
  return null;
}

async function postConfigWithFallback(
  appId: string,
  payload: Partial<AgentConfigRecord>,
  auth?: AgentServiceAuth,
): Promise<AgentConfigRecord> {
  const baseUrl = requireAgentsServiceBaseUrl();
  const headers = buildAgentServiceHeaders(auth);
  const encoded = encodeURIComponent(appId);
  const paths = [
    { method: "POST", path: "config" },
    { method: "PUT", path: `configs/${encoded}` },
    { method: "POST", path: `configs/${encoded}` },
  ];

  let lastError: string | null = null;
  for (const entry of paths) {
    const url = buildAgentsUrl(baseUrl, entry.path);
    const result = await agentsFetch(url, {
      method: entry.method,
      headers,
      body: { appId, ...payload },
    });
    if (result.ok) {
      const normalized = normalizeConfigPayload(result.data, appId);
      if (!normalized) {
        throw new Error("Agent configuration response was not recognized.");
      }
      return normalized;
    }
    if (result.status !== 404 && result.status !== 405) {
      lastError =
        typeof result.data === "string"
          ? result.data
          : `Request failed (${result.status})`;
      break;
    }
    lastError = `Request failed (${result.status})`;
  }

  throw new Error(lastError || "Unable to update agent configuration.");
}

export async function getAgentConfig(
  appId: string,
  auth?: AgentServiceAuth,
): Promise<AgentConfigRecord | null> {
  const normalized = sanitizeId(appId);
  if (!normalized) return null;
  return fetchConfigWithFallback(normalized, auth);
}

export async function upsertAgentConfig(
  appId: string,
  updates: Partial<AgentConfigRecord>,
  auth?: AgentServiceAuth,
): Promise<AgentConfigRecord> {
  const normalized = sanitizeId(appId);
  if (!normalized) {
    throw new Error("Invalid appId.");
  }
  return postConfigWithFallback(normalized, updates, auth);
}

export async function listAgentConfigs(auth?: AgentServiceAuth): Promise<AgentConfigView[]> {
  const baseUrl = requireAgentsServiceBaseUrl();
  const headers = buildAgentServiceHeaders(auth);
  const paths = ["configs", "agents", "list", ""];
  let lastError: string | null = null;

  for (const path of paths) {
    const url = buildAgentsUrl(baseUrl, path);
    const result = await agentsFetch(url, { headers });
    if (result.ok) {
      const items = extractConfigItems(result.data);
      return items
        .map((item) => normalizeConfig(item, "agent"))
        .filter(Boolean)
        .map((config) => toView(config as AgentConfigRecord));
    }
    if (result.status !== 404 && result.status !== 405) {
      lastError =
        typeof result.data === "string"
          ? result.data
          : `Request failed (${result.status})`;
      break;
    }
    lastError = `Request failed (${result.status})`;
  }

  if (lastError) {
    throw new Error(lastError);
  }
  return [];
}

export function toView(config: AgentConfigRecord): AgentConfigView {
  return {
    ...config,
    envKeys: Object.keys(config.envSecrets || {}),
    headerKeys: Object.keys(config.headerSecrets || {}),
  };
}
