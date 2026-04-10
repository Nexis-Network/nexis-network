import { cookies as readCookies, headers as readHeaders } from "next/headers";
import { cache } from "react";
import { randomUUID } from "crypto";

import {
  parseAgentDetailResponse,
  parseAgentListResponse,
  parseAgentListings,
  type AgentDetail,
  type AgentListingSummary,
  type AgentListItem,
  type AgentListingType,
} from "@/lib/agents/types";

export type AgentDocSection = {
  heading: string;
  body: string;
};

export type AgentDocsPayload = {
  agent: {
    id: string;
    name: string;
    visibility: string;
    updated_at: string | null;
  };
  sections: AgentDocSection[];
};

type MarketplaceFilters = {
  query?: string;
  listingTypes?: AgentListingType[];
  networks?: string[];
  assets?: string[];
};

type FetchOptions = {
  orgId?: string | null;
  signal?: AbortSignal;
  revalidate?: number | false;
};

class AgentApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AgentApiError";
    this.status = status;
  }
}

function serializeCookies(entries: { name: string; value: string }[]): string | undefined {
  if (!entries.length) return undefined;
  return entries.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

async function extractErrorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  const trimmed = text.trim();
  if (!trimmed) return response.statusText || `Request failed (${response.status})`;

  try {
    const json = JSON.parse(trimmed);
    const candidates = [json?.error, json?.message, json?.details];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
  } catch {
    // ignore parse errors
  }

  return trimmed;
}

async function throwIfNotOk(response: Response, fallbackMessage: string): Promise<void> {
  if (response.ok) return;
  const message = await extractErrorMessage(response);
  throw new AgentApiError(response.status, message || fallbackMessage);
}

async function resolveBaseUrl(): Promise<string> {
  try {
    const headerStore = await readHeaders();
    const protocol = headerStore.get("x-forwarded-proto") ?? "https";
    const forwardedHost = headerStore.get("x-forwarded-host");
    const host = forwardedHost ?? headerStore.get("host");
    if (host) {
      return `${protocol}://${host}`;
    }
  } catch {
    // Ignore: headers() is unavailable outside a request context.
  }
  const fallback = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return fallback.replace(/\/$/, "");
}

function buildSearchParams(filters: MarketplaceFilters & { orgId?: string | null }) {
  const params = new URLSearchParams();
  if (filters.query) {
    params.set("q", filters.query);
  }
  if (filters.listingTypes?.length) {
    params.set("listingTypes", filters.listingTypes.join(","));
  }
  if (filters.networks?.length) {
    params.set("networks", filters.networks.join(","));
  }
  if (filters.assets?.length) {
    params.set("assets", filters.assets.join(","));
  }
  if (filters.orgId) {
    params.set("orgId", filters.orgId);
  }
  return params;
}

type CookieStore = Awaited<ReturnType<typeof readCookies>>;

async function createFetchHeaders(
  cookieStore: CookieStore,
  options?: FetchOptions,
): Promise<HeadersInit> {
  const cookiesHeader = serializeCookies(cookieStore.getAll());
  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (cookiesHeader) {
    headers.Cookie = cookiesHeader;
  }

  const orgId = options?.orgId ?? null;
  if (orgId) {
    headers["x-org-id"] = orgId;
    headers["x-account-id"] = orgId;
  }

  headers["x-correlation-id"] = randomUUID();
  return headers;
}

export const getAgentMarketplace = cache(
  async (
    filters: MarketplaceFilters = {},
    options: FetchOptions = {},
  ): Promise<AgentListItem[]> => {
    const cookieStore = await readCookies();
    const orgId = options.orgId ?? null;

    const params = buildSearchParams({ ...filters, orgId });
    const baseUrl = await resolveBaseUrl();
    const url = `${baseUrl}/api/agents/list${params.toString() ? `?${params}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: await createFetchHeaders(cookieStore, { ...options, orgId }),
      cache: "no-store",
      signal: options.signal,
      next: options.revalidate === false ? { revalidate: 0 } : undefined,
    });

    await throwIfNotOk(response, "Failed to load agents");

    const payload = await response.json();
    return parseAgentListResponse(payload);
  },
);

export async function getAgentDetail(
  agentId: string,
  options: FetchOptions = {},
): Promise<AgentDetail> {
  if (!agentId) {
    throw new Error("agentId is required");
  }

  const cookieStore = await readCookies();
  const orgId = options.orgId ?? null;
  const baseUrl = await resolveBaseUrl();
  const url = `${baseUrl}/api/agents/${agentId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: await createFetchHeaders(cookieStore, { ...options, orgId }),
    cache: "no-store",
    signal: options.signal,
    next: options.revalidate === false ? { revalidate: 0 } : undefined,
  });

  await throwIfNotOk(response, "Failed to load agent");

  const payload = await response.json();
  return parseAgentDetailResponse(payload);
}

export async function getAgentListings(
  agentId: string,
  options: FetchOptions = {},
): Promise<AgentListingSummary[]> {
  if (!agentId) {
    throw new Error("agentId is required");
  }
  const cookieStore = await readCookies();
  const orgId = options.orgId ?? null;
  const baseUrl = await resolveBaseUrl();
  const url = `${baseUrl}/api/agents/${agentId}/listings`;

  const response = await fetch(url, {
    method: "GET",
    headers: await createFetchHeaders(cookieStore, { ...options, orgId }),
    cache: "no-store",
    signal: options.signal,
    next: options.revalidate === false ? { revalidate: 0 } : undefined,
  });

  await throwIfNotOk(response, "Failed to load agent listings");

  const payload = await response.json();
  return parseAgentListings(payload);
}

export async function getAgentDocs(
  agentId: string,
  options: FetchOptions = {},
): Promise<AgentDocsPayload> {
  if (!agentId) {
    throw new Error("agentId is required");
  }
  const cookieStore = await readCookies();
  const orgId = options.orgId ?? null;
  const baseUrl = await resolveBaseUrl();
  const url = `${baseUrl}/api/agents/${agentId}/docs`;

  const response = await fetch(url, {
    method: "GET",
    headers: await createFetchHeaders(cookieStore, { ...options, orgId }),
    cache: "no-store",
    signal: options.signal,
    next: options.revalidate === false ? { revalidate: 0 } : undefined,
  });

  await throwIfNotOk(response, "Failed to load agent documentation");

  const payload = (await response.json()) as AgentDocsPayload;
  if (!payload.sections || !Array.isArray(payload.sections)) {
    return { agent: payload.agent, sections: [] };
  }
  return payload;
}
