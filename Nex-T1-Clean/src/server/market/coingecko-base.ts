const DEFAULT_PUBLIC_API_BASE = "https://api.coingecko.com/api/v3";
const DEFAULT_PRO_API_BASE = "https://pro-api.coingecko.com/api/v3";

export type CoingeckoCredentials = {
  proApiKey?: string;
  demoApiKey?: string;
};

type UnknownRecord = Record<string, unknown>;

function isKnownCoingeckoHost(host: string): boolean {
  return host === "api.coingecko.com" || host === "pro-api.coingecko.com" || host.endsWith(".coingecko.com");
}

function normalizeApiBase(envBase: string | undefined): string | null {
  const raw = envBase?.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const normalizedPath = url.pathname.replace(/\/$/, "");
  const shouldInjectApiV3 = isKnownCoingeckoHost(url.host) && (normalizedPath === "" || normalizedPath === "/" || normalizedPath === "/api");

  url.pathname = shouldInjectApiV3 ? "/api/v3" : normalizedPath || "/";
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

function toUnknownRecord(value: unknown): UnknownRecord | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function parseEmbeddedJson(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const candidate = trimmed.slice(start, end + 1);
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    return null;
  }
}

function containsDemoMismatchMessage(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.toLowerCase();
  return normalized.includes("demo api key") && normalized.includes("pro-api.coingecko.com");
}

function containsProMismatchMessage(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.toLowerCase();
  return normalized.includes("pro api key") && normalized.includes("api.coingecko.com");
}

export function isCoingeckoDemoKeyMismatchError(payload: unknown): boolean {
  if (!payload) {
    return false;
  }

  if (payload instanceof Error) {
    return isCoingeckoDemoKeyMismatchError(payload.message);
  }

  if (typeof payload === "string") {
    if (/error_code["']?\s*[:=]\s*10011\b/.test(payload)) {
      return true;
    }
    if (containsDemoMismatchMessage(payload)) {
      return true;
    }
    const parsed = parseEmbeddedJson(payload);
    return parsed ? isCoingeckoDemoKeyMismatchError(parsed) : false;
  }

  const record = toUnknownRecord(payload);
  if (!record) {
    return false;
  }

  const status = toUnknownRecord(record.status);
  const errorCode = record.error_code ?? status?.error_code;
  if (errorCode === 10011 || errorCode === "10011") {
    return true;
  }

  return (
    containsDemoMismatchMessage(status?.error_message) ||
    containsDemoMismatchMessage(record.error_message) ||
    containsDemoMismatchMessage(record.message)
  );
}

export function isCoingeckoProKeyMismatchError(payload: unknown): boolean {
  if (!payload) {
    return false;
  }

  if (payload instanceof Error) {
    return isCoingeckoProKeyMismatchError(payload.message);
  }

  if (typeof payload === "string") {
    if (/error_code["']?\s*[:=]\s*10010\b/.test(payload)) {
      return true;
    }
    if (containsProMismatchMessage(payload)) {
      return true;
    }
    const parsed = parseEmbeddedJson(payload);
    return parsed ? isCoingeckoProKeyMismatchError(parsed) : false;
  }

  const record = toUnknownRecord(payload);
  if (!record) {
    return false;
  }

  const status = toUnknownRecord(record.status);
  const errorCode = record.error_code ?? status?.error_code;
  if (errorCode === 10010 || errorCode === "10010") {
    return true;
  }

  return (
    containsProMismatchMessage(status?.error_message) ||
    containsProMismatchMessage(record.error_message) ||
    containsProMismatchMessage(record.message)
  );
}

export function resolveCoingeckoApiBase(params: { apiKey?: string; envBase?: string }): string {
  const fallback = params.apiKey ? DEFAULT_PRO_API_BASE : DEFAULT_PUBLIC_API_BASE;
  const normalizedEnvBase = normalizeApiBase(params.envBase);
  if (!normalizedEnvBase) return fallback;

  try {
    const url = new URL(normalizedEnvBase);
    const isProHost = url.host === "pro-api.coingecko.com";
    if (isProHost && !params.apiKey) {
      return DEFAULT_PUBLIC_API_BASE;
    }
  } catch {
    // ignore and return env base
  }

  return normalizedEnvBase;
}

export function isCoingeckoProApiBase(apiBase: string | undefined): boolean {
  const normalized = normalizeApiBase(apiBase);
  if (!normalized) {
    return false;
  }

  try {
    return new URL(normalized).host === "pro-api.coingecko.com";
  } catch {
    return false;
  }
}

export function resolveCoingeckoCredentials(params?: {
  apiKey?: string;
  proApiKey?: string;
  demoApiKey?: string;
}): CoingeckoCredentials {
  const primaryKey = params?.apiKey?.trim() || "";
  const explicitProKey = params?.proApiKey?.trim() || "";
  const explicitDemoKey = params?.demoApiKey?.trim() || "";

  const proApiKey = explicitProKey || primaryKey;
  const demoApiKey =
    explicitDemoKey && explicitDemoKey !== proApiKey ? explicitDemoKey : undefined;

  return {
    proApiKey: proApiKey || undefined,
    demoApiKey,
  };
}

export function resolveCoingeckoWsAuthQuery(credentials: CoingeckoCredentials): {
  name: "x_cg_pro_api_key" | "x_cg_demo_api_key";
  value: string;
} | null {
  if (credentials.proApiKey) {
    return { name: "x_cg_pro_api_key", value: credentials.proApiKey };
  }
  if (credentials.demoApiKey) {
    return { name: "x_cg_demo_api_key", value: credentials.demoApiKey };
  }
  return null;
}
