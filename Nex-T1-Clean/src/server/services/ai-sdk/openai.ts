"server-only";

import { createOpenAI } from "@ai-sdk/openai";
import { isBuildEvaluation } from "@/lib/server/build-evaluation";


import { logger } from '@/lib/logger';
type EnvLookupKey =
  | "AI_GATEWAY_API_KEY"
  | "VERCEL_AI_GATEWAY_API_KEY"
  | "NEX_OPENAI_API_KEY"
  | "OPENAI_API_KEY"
  | "AI_API_KEY"
  | "NEX_OPENAI_BASE_URL"
  | "OPENAI_BASE_URL"
  | "OPENAI_ORG_ID"
  | "OPENAI_ORGANIZATION"
  | "OPENAI_PROJECT"
  | "OPENAI_PROJECT_ID";

function getEnv(name: EnvLookupKey) {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

const MOCK_OPENAI_API_KEY = "mock_openai_key_for_build";
const DEFAULT_AI_GATEWAY_OPENAI_BASE_URL = "https://ai-gateway.vercel.sh/v1";
const DEFAULT_DIRECT_OPENAI_BASE_URL = "https://api.openai.com/v1";

const resolvedGatewayApiKey = getEnv("AI_GATEWAY_API_KEY") ?? getEnv("VERCEL_AI_GATEWAY_API_KEY");

const sanitizeBaseUrl = (raw?: string) => {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
  const withoutKnownSuffix = withoutTrailingSlash
    .replace(/\/responses$/i, "")
    .replace(/\/chat\/completions$/i, "")
    .replace(/\/assistants\/runs$/i, "");

  // Ensure /v1 is present for the standard OpenAI host; avoid double-adding for custom gateways that already specify versioned paths.
  if (/api\.openai\.com/i.test(withoutKnownSuffix) && !/\/v\d+(\/|$)/i.test(withoutKnownSuffix)) {
    return `${withoutKnownSuffix}/v1`;
  }

  return withoutKnownSuffix;
};

const resolvedBaseURL = sanitizeBaseUrl(
  getEnv("NEX_OPENAI_BASE_URL") ??
    getEnv("OPENAI_BASE_URL") ??
    (resolvedGatewayApiKey ? DEFAULT_AI_GATEWAY_OPENAI_BASE_URL : undefined),
);

const isCustomBaseUrl = (baseUrl?: string) => {
  if (!baseUrl) return false;
  const normalized = baseUrl.replace(/\/+$/, "").toLowerCase();
  return !normalized.includes("api.openai.com");
};

export const hasUsableOpenAIApiKey = (apiKey?: string | null) =>
  typeof apiKey === "string" &&
  apiKey.length > 0 &&
  apiKey !== MOCK_OPENAI_API_KEY;

// Track if we've already logged the gateway warning to avoid log spam
let gatewayWarningLogged = false;

function resolveApiKey(baseUrl?: string): string {
  const gatewayApiKey = resolvedGatewayApiKey;
  const allowGatewayKey = Boolean(gatewayApiKey && isCustomBaseUrl(baseUrl));

  // Only warn once in development to reduce log noise
  if (gatewayApiKey && !allowGatewayKey && !gatewayWarningLogged && process.env.NODE_ENV !== "production") {
    gatewayWarningLogged = true;
    logger.warn(
      "[openai] AI_GATEWAY_API_KEY is set but will be ignored. To use it, set NEX_OPENAI_BASE_URL to your gateway endpoint.",
    );
  }

  const candidates = [
    allowGatewayKey ? gatewayApiKey : undefined,
    getEnv("NEX_OPENAI_API_KEY"),
    getEnv("OPENAI_API_KEY"),
    getEnv("AI_API_KEY"),
  ];

  const apiKey = candidates.find((value): value is string => Boolean(value));

  if (!apiKey) {
    // During build or CI, secrets might be missing. 
    // Return a mock key to allow the app to build/start, 
    // errors will properly occur at runtime if keys are still missing.
    if (!isBuildEvaluation()) {
      logger.warn("[openai] Missing OpenAI credentials. Using 'mock' key for build safety.");
    }
    return MOCK_OPENAI_API_KEY;
  }

  const trimmed = apiKey.trim();

  if (!allowGatewayKey && /^vck_[A-Za-z0-9]+/.test(trimmed)) {
    throw new Error(
      "Detected a Vercel AI Gateway API key (vck_) without a custom gateway base URL. Set NEX_OPENAI_BASE_URL/OPENAI_BASE_URL to your gateway endpoint or provide a direct OpenAI API key."
    );
  }

  return trimmed;
}

const resolvedApiKey = resolveApiKey(resolvedBaseURL);
const resolvedDirectBaseURL = sanitizeBaseUrl(
  getEnv("OPENAI_BASE_URL") ?? DEFAULT_DIRECT_OPENAI_BASE_URL,
);
const resolvedDirectApiKey = (() => {
  const candidates = [
    getEnv("NEX_OPENAI_API_KEY"),
    getEnv("OPENAI_API_KEY"),
    getEnv("AI_API_KEY"),
  ];

  const apiKey = candidates.find((value): value is string => Boolean(value));
  if (!apiKey) {
    return MOCK_OPENAI_API_KEY;
  }

  return apiKey.trim();
})();

const resolvedOrganization = getEnv("OPENAI_ORG_ID") ?? getEnv("OPENAI_ORGANIZATION");

const getProject = () => {
  const candidates = [getEnv("OPENAI_PROJECT_ID"), getEnv("OPENAI_PROJECT")];
  const valid = candidates.find((c) => c && c.startsWith("proj_"));
  return valid;
};
const resolvedProject = getProject();

// Keep the resolved project in config for observability/tests, but avoid sending
// OpenAI-only headers/params when using a non-OpenAI base URL (e.g. gateways).
const projectHeaderToUse = isCustomBaseUrl(resolvedBaseURL) ? undefined : resolvedProject;

export const openai = createOpenAI({
  apiKey: resolvedApiKey,
  baseURL: resolvedBaseURL,
  organization: resolvedOrganization,
  project: projectHeaderToUse,
});

export const directOpenai = createOpenAI({
  apiKey: resolvedDirectApiKey,
  baseURL: resolvedDirectBaseURL,
  organization: resolvedOrganization,
  project: resolvedProject,
});

export const openaiConfig = {
  apiKey: resolvedApiKey,
  baseURL: resolvedBaseURL,
  organization: resolvedOrganization,
  project: resolvedProject,
};

export const directOpenaiConfig = {
  apiKey: resolvedDirectApiKey,
  baseURL: resolvedDirectBaseURL,
  organization: resolvedOrganization,
  project: resolvedProject,
};

export const buildOpenAIHeaders = () => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${resolvedApiKey}`,
  };

  if (resolvedOrganization) {
    headers["OpenAI-Organization"] = resolvedOrganization;
  }

  if (projectHeaderToUse) {
    headers["OpenAI-Project"] = projectHeaderToUse;
  }

  return headers;
};

export const buildDirectOpenAIHeaders = () => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${resolvedDirectApiKey}`,
  };

  if (resolvedOrganization) {
    headers["OpenAI-Organization"] = resolvedOrganization;
  }

  if (resolvedProject) {
    headers["OpenAI-Project"] = resolvedProject;
  }

  return headers;
};
