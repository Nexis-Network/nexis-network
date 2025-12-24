import "server-only";

import type { RequestIdentity } from "@/lib/server/identity";
import { buildIdentityHeaders } from "@/lib/server/service-auth";

export type AgentServiceAuth = {
  apiKey?: string | null;
  identity?: RequestIdentity | null;
};

export type AgentsFetchResult = {
  ok: boolean;
  status: number;
  statusText: string;
  data: unknown;
};

export function getAgentsServiceBaseUrl() {
  return process.env.NEXIS_AGENTS_API_URL || null;
}

export function requireAgentsServiceBaseUrl() {
  const baseUrl = getAgentsServiceBaseUrl();
  if (!baseUrl) {
    throw new Error("Agents service is not configured.");
  }
  return baseUrl;
}

export function buildAgentsUrl(baseUrl: string, path: string) {
  const trimmed = baseUrl.replace(/\/$/, "");
  const cleaned = path ? `/${path.replace(/^\/+/, "")}` : "";
  return `${trimmed}${cleaned}`;
}

export function buildAgentServiceHeaders(auth?: AgentServiceAuth): Record<string, string> {
  const headers: Record<string, string> = {
    ...buildIdentityHeaders(auth?.identity),
  };
  if (auth?.apiKey) {
    headers["X-API-Key"] = auth.apiKey;
  }
  return headers;
}

export async function agentsFetch(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<AgentsFetchResult> {
  const requestHeaders: Record<string, string> = {
    ...options.headers,
  };

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (typeof options.body === "string" || options.body instanceof ArrayBuffer) {
      body = options.body as BodyInit;
    } else {
      body = JSON.stringify(options.body);
      if (!requestHeaders["Content-Type"]) {
        requestHeaders["Content-Type"] = "application/json";
      }
    }
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: requestHeaders,
    body,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  let data: unknown = null;

  if (response.status !== 204) {
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    data,
  };
}
