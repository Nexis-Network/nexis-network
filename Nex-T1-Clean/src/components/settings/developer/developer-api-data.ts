"use client";

import { getApiErrorMessage, unwrapApiPayload } from "@/lib/api-platform";

export type OrganizationSummary = {
  id: string;
  name: string;
};

export type DeveloperProjectRecord = {
  id: string;
  name: string;
  ownerType: "user" | "organization";
  ownerId: string;
  billingAccountId: string | null;
  hardCapUsd: number | null;
  softCapUsd: number | null;
  overageEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiKeyRecord = {
  id: string;
  name?: string | null;
  start: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  metadata?: Record<string, UntypedJson> | null;
  tier?: string | null;
  projectId?: string | null;
  allowedProducts?: string[] | null;
  rateLimit?: {
    requestsPerMinute: number | null;
    windowSeconds: number | null;
  };
  quotas?: { daily?: number | null; monthly?: number | null };
  ownerType?: "user" | "organization";
  ownerId?: string | null;
};

export type ApiKeyCreateResponse = ApiKeyRecord & {
  key: string;
};

export type DeveloperBillingPlan = {
  id: string;
  label: string;
  monthlyPriceUsd: number;
  includedCredits: number;
  requestsPerMinute: number;
  overagePricePerThousandCreditsUsd: number;
  notes?: string;
};

export type DeveloperApiProduct = {
  id: string;
  label: string;
  summary: string;
  minimumCredits: number;
  toolBaseline: string[];
  endpoint: string;
};

export type DeveloperApiModelsResponse = {
  data: DeveloperApiProduct[];
  plans: DeveloperBillingPlan[];
};

export type DeveloperUsageSummary = {
  monthly: {
    requests: number;
    billedCredits: number;
    spendUsd: number;
  };
  daily: {
    billedCredits: number;
    spendUsd: number;
  };
};

export type DeveloperBillingSummary = {
  projectId: string | null;
  projectName: string | null;
  plan: DeveloperBillingPlan;
  includedCredits: number;
  spendUsd: number;
  billedCredits: number;
  overageCredits: number;
  hardSpendCapUsd: number | null;
  softSpendCapUsd: number | null;
  overageEnabled: boolean;
};

export type DeveloperRequestLog = {
  id: string;
  requestId: string;
  projectId: string;
  product: string;
  upstreamModel: string;
  provider: string;
  status: string;
  inputTokens: number;
  outputTokens: number;
  billedCredits: number;
  totalCostUsd: number;
  toolNames: string[];
  responseLatencyMs: number | null;
  createdAt: string;
};

function readPayload<T>(payload: unknown): T | null {
  const unwrapped = unwrapApiPayload<T>(payload);
  return unwrapped ?? (payload as T | null);
}

function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query.length > 0 ? `?${query}` : "";
}

async function fetchJson<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    credentials: "include",
    ...init,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, `Request failed (${response.status})`));
  }

  const data = readPayload<T>(payload);
  if (data === null) {
    throw new Error("Request returned an empty response.");
  }

  return data;
}

export function fetchApiKeys(): Promise<ApiKeyRecord[]> {
  return fetchJson<ApiKeyRecord[]>("/api/auth/api-key/list");
}

export function fetchOrganizations(): Promise<OrganizationSummary[]> {
  return fetchJson<OrganizationSummary[]>("/api/auth/organization/list").catch(
    () => [],
  );
}

export function fetchDeveloperProjects(): Promise<DeveloperProjectRecord[]> {
  return fetchJson<DeveloperProjectRecord[]>("/api/auth/api-project/list");
}

export function fetchPublicDeveloperModels(): Promise<DeveloperApiModelsResponse> {
  return fetchJson<DeveloperApiModelsResponse>("/api/v1/models", {
    credentials: "same-origin",
  });
}

export function fetchDeveloperUsage(
  projectId?: string | null,
): Promise<DeveloperUsageSummary> {
  return fetchJson<DeveloperUsageSummary>(
    `/api/auth/developer-api/usage${buildQuery({ projectId })}`,
  );
}

export function fetchDeveloperBilling(
  projectId?: string | null,
): Promise<DeveloperBillingSummary> {
  return fetchJson<DeveloperBillingSummary>(
    `/api/auth/developer-api/billing${buildQuery({ projectId })}`,
  );
}

export function fetchDeveloperRequestLogs(args?: {
  projectId?: string | null;
  limit?: number | null;
}): Promise<DeveloperRequestLog[]> {
  return fetchJson<DeveloperRequestLog[]>(
    `/api/auth/developer-api/request-logs${buildQuery({
      projectId: args?.projectId,
      limit: args?.limit ?? null,
    })}`,
  );
}
