import "server-only";

type TrustService = {
  name: string;
  status: string;
  description: string | null;
};

type TrustIncident = {
  id: string;
  name: string;
  status: string;
  startedAt: string | null;
  resolvedAt: string | null;
};

export type TrustSummary = {
  overallStatus: string | null;
  updatedAt: string | null;
  services: TrustService[];
  incidents: TrustIncident[];
};

type TrustFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function toString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function normalizeService(raw: unknown): TrustService | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const name = toString(obj.name ?? obj.component_name ?? obj.service) ?? "Service";
  const status =
    toString(obj.status ?? obj.state ?? obj.health ?? obj.status_indicator) ?? "unknown";
  const description = toString(obj.description ?? obj.details ?? obj.message);
  return { name, status, description };
}

function normalizeIncident(raw: unknown): TrustIncident | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const id = toString(obj.id ?? obj.incident_id) ?? "incident";
  const name = toString(obj.name ?? obj.title ?? obj.summary) ?? "Incident";
  const status = toString(obj.status ?? obj.state) ?? "unknown";
  const startedAt = toString(obj.startedAt ?? obj.started_at ?? obj.started);
  const resolvedAt = toString(obj.resolvedAt ?? obj.resolved_at ?? obj.resolved);
  return { id, name, status, startedAt, resolvedAt };
}

async function fetchTrustJson(
  baseUrl: string,
  paths: string[],
): Promise<TrustFetchResult<unknown>> {
  const trimmed = baseUrl.replace(/\/$/, "");
  let lastError = "Trust center unavailable.";

  for (const path of paths) {
    const suffix = path ? `/${path.replace(/^\//, "")}` : "";
    const url = `${trimmed}${suffix}`;
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        lastError = `Request failed (${response.status})`;
        continue;
      }
      const data = await response.json();
      return { ok: true, data };
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "Unable to reach trust center.";
    }
  }

  return { ok: false, error: lastError };
}

function extractServices(data: Record<string, unknown>): TrustService[] {
  const candidates = [
    data.services,
    data.components,
    data.monitors,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data.status as any)?.services,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data.page as any)?.services,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map(normalizeService).filter(Boolean) as TrustService[];
    }
  }
  return [];
}

function extractIncidents(data: Record<string, unknown>): TrustIncident[] {
  const candidates = [
    data.incidents,
    data.active_incidents,
    data.events,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data.page as any)?.incidents,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map(normalizeIncident).filter(Boolean) as TrustIncident[];
    }
  }
  return [];
}

export async function fetchTrustSummary(): Promise<{
  summary: TrustSummary | null;
  error: string | null;
}> {
  const baseUrl = process.env.NEXIS_TRUST_CENTER_API_URL;
  if (!baseUrl) {
    return { summary: null, error: "Trust center service is not configured." };
  }

  const result = await fetchTrustJson(baseUrl, ["status", "summary", "health", ""]);
  if (!result.ok) {
    return { summary: null, error: result.error };
  }

  if (!result.data || typeof result.data !== "object") {
    return { summary: null, error: "Trust center data is unavailable." };
  }

  const obj = result.data as Record<string, unknown>;
  const overallStatus =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toString(obj.status ?? obj.state ?? obj.overall_status ?? (obj.page as any)?.status) ?? null;
  const updatedAt = toString(obj.updatedAt ?? obj.updated_at ?? obj.last_updated);
  const services = extractServices(obj);
  const incidents = extractIncidents(obj);

  return {
    summary: { overallStatus, updatedAt, services, incidents },
    error: null,
  };
}
