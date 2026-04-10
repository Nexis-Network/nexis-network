import { logger } from '@/lib/logger';

let otel = null;
try {
  // Try to require the actual OpenTelemetry API
  otel = require("@opentelemetry/api");
} catch {
  // logger.debug("OpenTelemetry API not available, using mock");
  try {
    // Fallback to local mock for edge/no-op environments
    // Use relative path to ensure reliable resolution
    otel = require("../../lib/mock-opentelemetry-api.js");
  } catch {
    // logger.debug("Mock OpenTelemetry not available either");
    // Provide a basic inline mock as final fallback
    otel = {
      trace: {
        getTracer: () => ({
          startSpan: () => ({
            setStatus: () => {},
            setAttributes: () => {},
            addEvent: () => {},
            end: () => {},
          }),
          startActiveSpan: (
            _name: string,
            fn: (span: UntypedJson) => UntypedJson,
          ) => fn({}),
        }),
      },
      metrics: {
        getMeter: () => ({
          createCounter: () => ({
            add: () => {},
          }),
          createHistogram: () => ({
            record: () => {},
          }),
        }),
      },
    };
  }
}

const meter = otel?.metrics?.getMeter?.("nex-front-end") ?? null;

const counters = {
  cacheHit: meter?.createCounter?.("cache_hit", { description: "Cache hits" }),
  cacheMiss: meter?.createCounter?.("cache_miss", { description: "Cache misses" }),
  vendorCalls: meter?.createCounter?.("vendor_calls_total", { description: "Vendor calls across external market, wallet, and indexing providers" }),
  cacheWrite: meter?.createCounter?.("cache_writes_total", { description: "Cache writes by namespace" }),
  apiRequests: meter?.createCounter?.("api_requests_total", { description: "API route invocations" }),
  operations: meter?.createCounter?.("app_operations_total", { description: "Observed domain operations across server modules" }),
};

const histograms = {
  vendorDuration: meter?.createHistogram?.("vendor_duration_ms", { description: "Vendor call duration ms" }),
  apiDuration: meter?.createHistogram?.("api_duration_ms", { description: "API route duration ms" }),
  operationDuration: meter?.createHistogram?.("app_operation_duration_ms", { description: "Observed domain operation duration ms" }),
};

const apiProfilerWarnThreshold =
  Number.parseInt(process.env.API_PROFILER_WARN_THRESHOLD_MS ?? "10000", 10) || 0;
const apiProfilerWarnCooldown =
  Number.parseInt(process.env.API_PROFILER_WARN_COOLDOWN_MS ?? "30000", 10) || 0;
const apiProfilerLastWarnAt = new Map<string, number>();

export const metrics = {
  cacheHit(ns: string) {
    try { counters.cacheHit?.add(1, { ns }); } catch {}
  },
  cacheMiss(ns: string) {
    try { counters.cacheMiss?.add(1, { ns }); } catch {}
  },
  vendorCall(vendor: string, ok: boolean) {
    try { counters.vendorCalls?.add(1, { vendor, status: ok ? "ok" : "error" }); } catch {}
  },
  vendorDuration(vendor: string, ms: number) {
    try { histograms.vendorDuration?.record(ms, { vendor }); } catch {}
  },
  cacheWrite(ns: string) {
    try { counters.cacheWrite?.add(1, { ns }); } catch {}
  },
  apiRequest(route: string, status: "ok" | "error") {
    try { counters.apiRequests?.add(1, { route, status }); } catch {}
  },
  apiDuration(route: string, ms: number) {
    try { histograms.apiDuration?.record(ms, { route }); } catch {}
  },
  operation(domain: string, operation: string, status: "ok" | "error") {
    try { counters.operations?.add(1, { domain, operation, status }); } catch {}
  },
  operationDuration(domain: string, operation: string, ms: number) {
    try { histograms.operationDuration?.record(ms, { domain, operation }); } catch {}
  },
};

export async function timeVendor<T>(vendor: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const out = await fn();
    metrics.vendorCall(vendor, true);
    metrics.vendorDuration(vendor, Date.now() - start);
    return out;
  } catch (err) {
    metrics.vendorCall(vendor, false);
    metrics.vendorDuration(vendor, Date.now() - start);
    throw err;
  }
}

export async function timeApiRoute<T>(route: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  let status: "ok" | "error" = "ok";
  try {
    const result = await fn();
    return result;
  } catch (error) {
    status = "error";
    throw error;
  } finally {
    const duration = Date.now() - start;
    metrics.apiRequest(route, status);
    metrics.apiDuration(route, duration);
    if (apiProfilerWarnThreshold > 0 && duration >= apiProfilerWarnThreshold) {
      const dedupeKey = `${route}:${status}`;
      const now = Date.now();
      const lastWarnAt = apiProfilerLastWarnAt.get(dedupeKey) ?? 0;
      const shouldWarn =
        apiProfilerWarnCooldown <= 0 || now - lastWarnAt >= apiProfilerWarnCooldown;

      if (shouldWarn) {
        apiProfilerLastWarnAt.set(dedupeKey, now);
        logger.warn(
          {
            component: "api-profiler",
            route,
            status,
            durationMs: duration,
            warnThresholdMs: apiProfilerWarnThreshold,
            warnCooldownMs: apiProfilerWarnCooldown,
          },
          "[api-profiler] slow api route",
        );
      }
    }
  }
}
