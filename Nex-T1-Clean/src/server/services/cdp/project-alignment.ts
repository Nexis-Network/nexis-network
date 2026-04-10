import "server-only";

import { generateJwt } from "@coinbase/cdp-sdk/auth";

import { getActiveCdpKid, mintCdpJwt } from "@/server/auth/cdp-jwt-bridge";
import { getCdpClient } from "@/server/services/cdp/client";

const ACTIVE_TOKEN_HOST = "api.cdp.coinbase.com";
const ACTIVE_TOKEN_PATH = "/apikeys/v1/tokens/active";
const ACTIVE_TOKEN_URL = `https://${ACTIVE_TOKEN_HOST}${ACTIVE_TOKEN_PATH}`;
const REQUEST_TIMEOUT_MS = 15_000;
const CACHE_TTL_MS = 5 * 60 * 1000;

type ActiveCdpApiKeyToken = {
  id: string;
  organizationId: string;
  projectId: string;
  allowedDomains?: string[];
};

let cachedActiveToken: ActiveCdpApiKeyToken | null = null;
let cachedAt = 0;

function getConfiguredProjectId(): string | null {
  return (
    process.env.CDP_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_CDP_PROJECT_ID?.trim() ||
    null
  );
}

function getCdpApiCredentials(): { apiKeyId: string; apiKeySecret: string } {
  const apiKeyId = process.env.CDP_API_KEY_ID?.trim();
  const apiKeySecret = process.env.CDP_API_KEY_SECRET?.trim();

  if (!apiKeyId || !apiKeySecret) {
    throw new Error(
      "CDP API credentials are not configured. Set CDP_API_KEY_ID and CDP_API_KEY_SECRET.",
    );
  }

  return { apiKeyId, apiKeySecret };
}

function isFreshCache(): boolean {
  return Boolean(cachedActiveToken) && Date.now() - cachedAt < CACHE_TTL_MS;
}

function normalizeOrigin(value: string | null | undefined): string {
  return (value ?? "https://nex-t1.ai").trim().replace(/\/+$/u, "");
}

async function fetchActiveToken(): Promise<ActiveCdpApiKeyToken> {
  const { apiKeyId, apiKeySecret } = getCdpApiCredentials();
  const bearerToken = await generateJwt({
    apiKeyId,
    apiKeySecret,
    requestMethod: "GET",
    requestHost: ACTIVE_TOKEN_HOST,
    requestPath: ACTIVE_TOKEN_PATH,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(ACTIVE_TOKEN_URL, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `CDP active token lookup failed: ${response.status} ${errorText.slice(0, 200)}`.trim(),
      );
    }

    const token = await response.json() as ActiveCdpApiKeyToken;
    if (!token.projectId?.trim()) {
      throw new Error("CDP active token lookup did not return a projectId.");
    }

    cachedActiveToken = token;
    cachedAt = Date.now();
    return token;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        `CDP active token lookup timed out after ${REQUEST_TIMEOUT_MS}ms.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getActiveCdpApiKeyToken(): Promise<ActiveCdpApiKeyToken> {
  if (isFreshCache() && cachedActiveToken) {
    return cachedActiveToken;
  }

  return fetchActiveToken();
}

export async function resolveAlignedCdpProjectId(): Promise<string> {
  const configuredProjectId = getConfiguredProjectId();
  const activeToken = await getActiveCdpApiKeyToken();

  if (configuredProjectId && configuredProjectId !== activeToken.projectId) {
    throw new Error(
      `CDP project misalignment: configured project ${configuredProjectId} does not match the active API key project ${activeToken.projectId}.`,
    );
  }

  return configuredProjectId ?? activeToken.projectId;
}

export async function buildCdpCustomAuthRemediationMessage(projectId: string): Promise<string> {
  const issuer = normalizeOrigin(process.env.CDP_JWT_ISSUER || "https://nex-t1.ai");
  const audience = (process.env.CDP_JWT_AUDIENCE?.trim() || "cdp");
  const kid = await getActiveCdpKid();
  const jwksUrl = `${issuer}/api/auth/cdp/.well-known/jwks.json`;

  return [
    `CDP custom auth is not aligned for project ${projectId}.`,
    `In CDP Portal, configure Custom Authentication for project ${projectId} to use JWKS ${jwksUrl}.`,
    `Expected issuer ${issuer}, audience ${audience}, subject claim sub, and key id ${kid}.`,
  ].join(" ");
}

export async function validateCdpCustomAuthAccessToken(params: {
  userId: string;
  email?: string | null;
}): Promise<void> {
  const cdp = await getCdpClient();
  if (!cdp) {
    throw new Error("CDP server client is not available.");
  }

  const accessToken = await mintCdpJwt(params.userId, params.email);
  await cdp.endUser.validateAccessToken({ accessToken });
}

export function resetCdpProjectAlignmentCache(): void {
  cachedActiveToken = null;
  cachedAt = 0;
}
