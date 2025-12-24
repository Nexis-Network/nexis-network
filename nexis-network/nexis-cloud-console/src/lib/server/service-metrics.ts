import "server-only";

import { getNexisApiBaseUrl, getNexisApiVersion } from "@/lib/server/nexis-cloud";

type ServiceFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type BillingSummary = {
  monthlyCost: number | null;
  currency: string | null;
  balance: number | null;
};

export type BillingUsagePoint = {
  date: string;
  cost: number | null;
  currency: string | null;
};

type AgentsSummary = {
  activeAgents: number | null;
  totalAgents: number | null;
};

type ApiUsageSummary = {
  requestCount: number | null;
  errorCount: number | null;
  tokensUsed: number | null;
  periodLabel: string | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in source) {
      const value = toNumber(source[key]);
      if (value !== null) return value;
    }
  }
  return null;
}

function pickString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function normalizeArray(source: unknown) {
  return Array.isArray(source) ? source : null;
}

function normalizeItems(source: unknown) {
  if (!source || typeof source !== "object") return null;
  const obj = source as Record<string, unknown>;
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.data)) return obj.data;
  if (Array.isArray(obj.agents)) return obj.agents;
  return null;
}

async function fetchServiceJson(
  baseUrl: string,
  paths: string[],
  apiKey?: string | null,
  headers?: Record<string, string>
): Promise<ServiceFetchResult<unknown>> {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  let lastError = "Service unavailable.";

  for (const path of paths) {
    const suffix = path ? `/${path.replace(/^\//, "")}` : "";
    const url = `${normalizedBase}${suffix}`;
    try {
      const requestHeaders: Record<string, string> = {
        ...(headers ?? {}),
      };
      if (apiKey) {
        requestHeaders["X-API-Key"] = apiKey;
      }
      const response = await fetch(url, {
        headers: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
        cache: "no-store",
      });
      if (!response.ok) {
        lastError = `Request failed (${response.status})`;
        continue;
      }
      const data = await response.json();
      return { ok: true, data };
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "Unable to reach service.";
    }
  }

  return { ok: false, error: lastError };
}

export async function fetchBillingSummary(apiKey?: string | null): Promise<{
  summary: BillingSummary | null;
  error: string | null;
}> {
  const baseUrl = process.env.NEXIS_BILLING_API_URL;
  if (!baseUrl) {
    return { summary: null, error: "Billing service is not configured." };
  }

  const result = await fetchServiceJson(baseUrl, ["summary", "stats", ""], apiKey);
  if (!result.ok) {
    return { summary: null, error: result.error };
  }

  const data = result.data;
  if (!data || typeof data !== "object") {
    return { summary: null, error: "Billing data is unavailable." };
  }

  const obj = data as Record<string, unknown>;
  const summary: BillingSummary = {
    monthlyCost: pickNumber(obj, [
      "monthly_cost",
      "month_to_date_cost",
      "month_to_date",
      "monthly_total",
      "period_spend",
    ]),
    currency: pickString(obj, ["currency", "billing_currency", "unit", "symbol"]),
    balance: pickNumber(obj, ["balance", "credits", "credit_balance", "available_credits"]),
  };

  if (summary.monthlyCost === null && summary.balance === null) {
    return { summary: null, error: "Billing data format not recognized." };
  }

  return { summary, error: null };
}

function normalizeUsagePoints(data: unknown): BillingUsagePoint[] {
  if (!data) return [];
  const items = Array.isArray(data)
    ? data
    : typeof data === "object" && data !== null
      ? ((data as Record<string, unknown>).items ??
          (data as Record<string, unknown>).data ??
          (data as Record<string, unknown>).series ??
          (data as Record<string, unknown>).usage ??
          (data as Record<string, unknown>).history ??
          null)
      : null;

  if (!Array.isArray(items)) return [];
  return items
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const obj = entry as Record<string, unknown>;
      const date =
        pickString(obj, ["date", "day", "timestamp", "time", "period"]) ??
        new Date().toISOString();
      const cost =
        pickNumber(obj, ["cost", "amount", "spend", "value", "total"]) ?? null;
      const currency = pickString(obj, ["currency", "unit", "symbol"]);
      return { date, cost, currency };
    })
    .filter(Boolean) as BillingUsagePoint[];
}

export async function fetchBillingUsageSeries(apiKey?: string | null): Promise<{
  series: BillingUsagePoint[];
  error: string | null;
}> {
  const baseUrl = process.env.NEXIS_BILLING_API_URL;
  if (!baseUrl) {
    return { series: [], error: "Billing service is not configured." };
  }

  const result = await fetchServiceJson(
    baseUrl,
    ["usage", "costs", "spend", "history", "timeseries", ""],
    apiKey,
  );
  if (!result.ok) {
    return { series: [], error: result.error };
  }

  const data = result.data;
  if (!data || typeof data !== "object") {
    return { series: [], error: "Usage series data is unavailable." };
  }

  const series = normalizeUsagePoints(data);
  if (series.length === 0) {
    return { series: [], error: "Usage series format not recognized." };
  }

  return { series, error: null };
}

export async function fetchAgentsSummary(apiKey?: string | null): Promise<{
  summary: AgentsSummary | null;
  error: string | null;
}> {
  const baseUrl = process.env.NEXIS_AGENTS_API_URL;
  if (!baseUrl) {
    return { summary: null, error: "Agents service is not configured." };
  }

  const result = await fetchServiceJson(baseUrl, ["summary", "stats", ""], apiKey);
  if (!result.ok) {
    return { summary: null, error: result.error };
  }

  const data = result.data;
  if (!data || typeof data !== "object") {
    const list = normalizeArray(data);
    if (list) {
      return { summary: { activeAgents: list.length, totalAgents: list.length }, error: null };
    }
    return { summary: null, error: "Agents data is unavailable." };
  }

  const obj = data as Record<string, unknown>;
  const items = normalizeItems(obj) || normalizeArray(obj);
  const totalAgents =
    items?.length ??
    pickNumber(obj, ["total", "count", "total_agents", "agents_count"]);
  const activeAgents =
    pickNumber(obj, ["active", "active_agents", "running", "running_agents"]) ??
    totalAgents;

  if (totalAgents === null && activeAgents === null) {
    return { summary: null, error: "Agents data format not recognized." };
  }

  return {
    summary: {
      activeAgents,
      totalAgents,
    },
    error: null,
  };
}

export async function fetchApiUsageSummary(apiKey?: string | null): Promise<{
  summary: ApiUsageSummary | null;
  error: string | null;
}> {
  const overrideUrl = process.env.NEXIS_API_USAGE_URL || process.env.NEXIS_USAGE_API_URL;
  const baseUrl = overrideUrl || getNexisApiBaseUrl();
  if (!baseUrl) {
    return { summary: null, error: "Usage service is not configured." };
  }

  const headers = !overrideUrl
    ? {
        "X-Phala-Version": getNexisApiVersion(),
      }
    : undefined;

  const result = await fetchServiceJson(
    baseUrl,
    [
      "account/usage",
      "account/stats",
      "usage",
      "stats",
      "users/me/usage",
      "users/me",
      "",
    ],
    apiKey,
    headers
  );
  if (!result.ok) {
    return { summary: null, error: result.error };
  }

  const data = result.data;
  if (!data || typeof data !== "object") {
    return { summary: null, error: "Usage data is unavailable." };
  }

  const obj = data as Record<string, unknown>;
  const nested =
    (obj.usage && typeof obj.usage === "object" ? (obj.usage as Record<string, unknown>) : null) ||
    (obj.stats && typeof obj.stats === "object" ? (obj.stats as Record<string, unknown>) : null) ||
    (obj.summary && typeof obj.summary === "object" ? (obj.summary as Record<string, unknown>) : null) ||
    (obj.data && typeof obj.data === "object" ? (obj.data as Record<string, unknown>) : null) ||
    (obj.metrics && typeof obj.metrics === "object" ? (obj.metrics as Record<string, unknown>) : null);
  const source = nested ?? obj;
  const summary: ApiUsageSummary = {
    requestCount: pickNumber(source, [
      "requests",
      "request_count",
      "total_requests",
      "requests_total",
      "count",
    ]),
    errorCount: pickNumber(source, [
      "errors",
      "error_count",
      "failed_requests",
      "errors_total",
      "failed_total",
    ]),
    tokensUsed: pickNumber(source, [
      "tokens",
      "token_count",
      "tokens_used",
      "tokens_total",
      "total_tokens",
    ]),
    periodLabel: pickString(source, ["period", "window", "interval", "label"]),
  };

  if (
    summary.requestCount === null &&
    summary.errorCount === null &&
    summary.tokensUsed === null
  ) {
    return { summary: null, error: "Usage data format not recognized." };
  }

  return { summary, error: null };
}
